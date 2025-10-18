import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import { humanReadableFloat } from "@/lib/common";

import { createAccountProposalStore } from "@/nanoeffects/AccountProposedTransactions.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import ExternalLink from "./common/ExternalLink.jsx";
import { Separator } from "./ui/separator.jsx";

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

export default function Proposals(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
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
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [proposals, setProposals] = useState();
  useEffect(() => {
    if (usr && usr.chain && currentNode) {
      const proposalStore = createAccountProposalStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);
      proposalStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setProposals(data);
        }
      });
    }
  }, [usr, currentNode]);

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
        currentNode ? currentNode.url : null,
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

  const proposalRow = ({ index, style }) => {
    const proposal = filteredProposals[index];
    const proposer = proposal.proposer;
    const expirationTime = new Date(proposal.expiration_time);
    const reviewPeriodTime = new Date(proposal.review_period_time);

    const proposedTransaction = proposal.proposed_transaction;
    const operations = proposedTransaction.operations;

    const proposerAccount = proposerAccounts.find((x) => x.id === proposer);

    const [approvedCount, setApprovedCount] = useState(0);

    return (
      <div style={{ ...style }} key={`card-${proposal.id}`}>
        <Card className="ml-3 mr-3 mt-3">
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="col-span-2">
                  {t("Proposals:proposalID")}
                  {": "}
                  <ExternalLink
                    classnamecontents="hover:text-purple-500"
                    type="text"
                    text={proposal.id}
                    hyperlink={`https://explorer.bitshares.ws/#/objects/${
                      proposal.id
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                  <Badge
                    className="ml-3"
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
                      <ExternalLink
                        classnamecontents="hover:text-purple-500"
                        type="text"
                        text={proposerAccount.name}
                        hyperlink={`https://explorer.bitshares.ws/#/accounts/${
                          proposerAccount.name
                        }${
                          usr.chain === "bitshares" ? "" : "?network=testnet"
                        }`}
                      />
                    ) : (
                      <>???</>
                    )}
                  </b>{" "}
                  (
                  <ExternalLink
                    classnamecontents="hover:text-purple-500"
                    type="text"
                    text={proposer}
                    hyperlink={`https://explorer.bitshares.ws/#/accounts/${proposer}${
                      usr.chain === "bitshares" ? "" : "?network=testnet"
                    }`}
                  />
                  )
                  <Badge
                    className="ml-3"
                    onClick={() => {
                      setViewJSON(true);
                      setJSON(proposerAccount);
                    }}
                  >
                    JSON
                  </Badge>
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
                <div className="border rounded-md pl-2 pb-2 mt-2">
                  {operations.length && operations.length > 10 ? (
                    <Badge
                      onClick={() => {
                        setViewJSON(true);
                        setJSON({
                          operations,
                        });
                      }}
                      className=""
                    >
                      ⚠️ {operations.length} operations
                    </Badge>
                  ) : (
                    operations.map((x) => (
                      <Badge
                        className="ml-1"
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
          </CardContent>
          <CardFooter>
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="col-span-2">
                <Separator />
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setApproveOpen(true);
                  }}
                  className="w-1/2"
                >
                  {t("Proposals:beginApprovalProcess")}
                </Button>
                <Button
                  onClick={() => {
                    setRejectOpen(true);
                    setRejectedProposalID(proposal.id);
                  }}
                  className="w-1/2"
                >
                  {t("Proposals:reject")}
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
        {approveOpen ? (
          <Dialog
            open={approveOpen}
            onOpenChange={(open) => {
              setApproveOpen(open);
              if (!open) {
                setApprovedCount(0);
                setFinalApprovalOpen(false);
                setChosenProposal();
              }
            }}
          >
            <DialogContent className="sm:max-w-[750px] bg-white">
              <DialogHeader>
                <DialogTitle>{t("Proposals:approveProposal")}</DialogTitle>
                <DialogDescription>
                  {t("Proposals:approveProposalDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3">
                {proposal &&
                proposal.proposed_transaction &&
                proposal.proposed_transaction.operations &&
                !finalApprovalOpen
                  ? proposal.proposed_transaction.operations.map(
                      (operation, index) => (
                        <div key={`operation_${index}`}>
                          <div>
                            {t("Proposals:operationType")}:{" "}
                            <b>{operationStrings[operation[0]]}</b> (
                            {operation[0]})
                          </div>
                          <div className="mt-1">
                            {t("Proposals:operationDescription")}:<br />
                            {t(`Operations:${operationStrings[operation[0]]}`)}
                          </div>
                          <Textarea
                            className="w-full h-32 mt-2 p-2 border rounded-md mb-5 mt-3"
                            value={JSON.stringify(operation, null, 2)}
                            readOnly={true}
                            rows={15}
                          />
                          <div className="flex space-x-3 mt-2">
                            <Button
                              onClick={() => {
                                const newCount = approvedCount + 1;
                                setApprovedCount(newCount);
                                if (
                                  newCount ===
                                  proposal.proposed_transaction.operations
                                    .length
                                ) {
                                  setFinalApprovalOpen(true);
                                  setChosenProposal(proposal);
                                }
                              }}
                            >
                              {t("Proposals:approveProposedOperation")}
                            </Button>
                            <Button
                              onClick={() => {
                                setApproveOpen(false);
                                setApprovedCount(0);
                                setChosenProposal();
                              }}
                            >
                              {t("Proposals:rejectProposedOperation")}
                            </Button>
                          </div>
                        </div>
                      )
                    )
                  : null}
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("Proposals:cardTitle")}</CardTitle>
              <CardDescription>
                <p>{t("Proposals:cardDescription")}</p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {filteredProposals && filteredProposals.length ? (
                  <div className="w-full border-2 max-h-[500px] overflow-auto">
                    <List
                      rowComponent={proposalRow}
                      rowCount={filteredProposals.length}
                      rowHeight={265}
                      rowProps={{}}
                    />
                  </div>
                ) : (
                  <p>{t("Proposals:noProposals")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("Proposals:risksTitle")}</CardTitle>
              <CardDescription>
                {t("Proposals:risksDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm">
                <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                  <li>{t("Proposals:risk1")}</li>
                  <li>{t("Proposals:risk2")}</li>
                </ul>
              </span>
            </CardContent>
          </Card>

          {viewJSON && json ? (
            <Dialog
              open={viewJSON}
              onOpenChange={(open) => {
                setViewJSON(open);
              }}
            >
              <DialogContent className="sm:max-w-[750px] bg-white">
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
                  className="w-1/4 mt-2"
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
