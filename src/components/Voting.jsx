import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
  memo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { Vote, Check, X, Ticket, ArrowUp, ArrowDown } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
  EmptyDescription,
} from "@/components/ui/empty";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

import { Avatar } from "@/components/Avatar.tsx";

import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import {
  createObjectStore,
  createEveryObjectStore,
} from "@/nanoeffects/Objects.ts";

import { humanReadableFloat, debounce } from "@/lib/common";
import ExternalLink from "./common/ExternalLink.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = datePart.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

const WitnessRow = memo(function WitnessRow({
  index,
  style,
  sortedWitnesses,
  witnessVotes,
  setWitnessVotes,
}) {
  const witness = sortedWitnesses[index];
  const isToggled = witness ? witnessVotes.includes(witness.vote_id) : false;
  if (!witness) return null;

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={witness.id}>
      <div className={`relative overflow-hidden rounded-xl border ${witness.active ? "border-[hsl(var(--accent-success)/0.2)] bg-[hsl(var(--accent-success)/0.05)]" : "border-[hsl(var(--accent-1)/0.15)] bg-card/60"} backdrop-blur-xl shadow-sm hover:border-[hsl(var(--accent-1)/0.25)] transition-all duration-300`}>
        <div className="p-3 text-sm">
          <div className="grid grid-cols-4 gap-2 items-center">
            <div className="flex items-center">
              <span className="hidden md:block">
                <Avatar
                  size={30}
                  name={witness.name}
                  extra={`W${index}`}
                  expression={
                    witness.signingKey ===
                      "BTS1111111111111111111111111111111114T1Anm" ||
                    !witness.active
                      ? { eye: "sleepy", mouth: "unhappy" }
                      : { eye: "normal", mouth: "open" }
                  }
                  colors={[
                    "#F0AB3D",
                    "#C271B4",
                    "#C20D90",
                    "#92A1C6",
                    "#146A7C",
                  ]}
                />
              </span>
              <span className="ml-2">{witness.name}</span>
            </div>
            <div>
              <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                {witness.id}
              </span>{" "}
              (
              <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                {witness.account_id}
              </span>
              )
            </div>
            <div>
              {humanReadableFloat(witness.total_votes, 5).toLocaleString(
                undefined,
                { minimumFractionDigits: 0, maximumFractionDigits: 0 },
              )}
            </div>
            <div>
              <Toggle
                onClick={() => {
                  if (isToggled) {
                    setWitnessVotes((prev) =>
                      prev.filter((v) => v !== witness.vote_id),
                    );
                  } else {
                    setWitnessVotes((prev) => [...prev, witness.vote_id]);
                  }
                }}
                value={isToggled}
              >
                {isToggled ? <Check className="h-4 w-4 text-[hsl(var(--accent-success-fg))]" /> : <X className="h-4 w-4 text-[hsl(var(--accent-danger-fg))]" />}
              </Toggle>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const CommitteeRow = memo(function CommitteeRow({
  index,
  style,
  sortedMembers,
  committeeVotes,
  setCommitteeVotes,
  _chain,
}) {
  const member = sortedMembers[index];
  const isToggled = member ? committeeVotes.includes(member.vote_id) : false;
  if (!member) return null;

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={member.id}>
      <div className={`relative overflow-hidden rounded-xl border ${member.active ? "border-[hsl(var(--accent-success)/0.2)] bg-[hsl(var(--accent-success)/0.05)]" : "border-[hsl(var(--accent-1)/0.15)] bg-card/60"} backdrop-blur-xl shadow-sm hover:border-[hsl(var(--accent-1)/0.25)] transition-all duration-300`}>
        <div className="p-3 text-sm">
          <div className="grid grid-cols-4 gap-2 items-center">
            <div className="flex items-center">
              <span className="hidden md:block">
                <Avatar
                  size={30}
                  name={member.name}
                  extra={`CM${index}`}
                  expression={
                    !member.active
                      ? { eye: "sleepy", mouth: "unhappy" }
                      : { eye: "normal", mouth: "open" }
                  }
                  colors={[
                    "#146A7C",
                    "#F0AB3D",
                    "#C271B4",
                    "#C20D90",
                    "#92A1C6",
                  ]}
                />
              </span>
              <span className="ml-2">{member.name}</span>
            </div>
            <div>
              <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                {member.id}
              </span>{" "}
              (
              <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                {member.account_id}
              </span>
              )
            </div>
            <div>
              {humanReadableFloat(member.total_votes, 5).toLocaleString(
                undefined,
                { minimumFractionDigits: 0, maximumFractionDigits: 0 },
              )}
              {_chain === "bitshares" ? " BTS" : " TEST"}
            </div>
            <div>
              <Toggle
                onClick={() => {
                  if (isToggled) {
                    setCommitteeVotes((prev) =>
                      prev.filter((v) => v !== member.vote_id),
                    );
                  } else {
                    setCommitteeVotes((prev) => [...prev, member.vote_id]);
                  }
                }}
                value={isToggled}
              >
                {isToggled ? <Check className="h-4 w-4 text-[hsl(var(--accent-success-fg))]" /> : <X className="h-4 w-4 text-[hsl(var(--accent-danger-fg))]" />}
              </Toggle>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const WorkerRow = memo(function WorkerRow({
  index,
  style,
  sortedWorkers,
  workerVotes,
  setWorkerVotes,
  budgetConsumerSet,
  calculateNeededVotes,
}) {
  const worker = sortedWorkers[index];
  const isToggled = worker ? workerVotes.includes(worker.vote_for) : false;
  if (!worker) return null;

  const begin = formatDate(worker.work_begin_date);
  const end = formatDate(worker.work_end_date);

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={worker.id}>
      <div className={`relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 backdrop-blur-xl shadow-sm hover:border-[hsl(var(--accent-1)/0.25)] transition-all duration-300`}>
        <div className="p-3 text-sm">
          <div className="grid grid-cols-8 md:grid-cols-12 gap-2 items-center">
            <div>
              {budgetConsumerSet.has(worker.id)
                ? <Check className="h-3.5 w-3.5 text-[hsl(var(--accent-success-fg))]" />
                : <X className="h-3.5 w-3.5 text-[hsl(var(--accent-danger-fg))]" />}
            </div>
            <div className="hidden md:block">
              <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                {worker.id}
              </span>
            </div>
            <div className="col-span-3 grid grid-cols-1">
              <div title={worker.name}>
                {worker.name.length > 20
                  ? `${worker.name.slice(0, 20)}...`
                  : worker.name}
              </div>
              <div>
                <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                  {worker.username}
                </span>{" "}
                (
                <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                  {worker.worker_account}
                </span>
                )
              </div>
            </div>
            <div className="hidden md:block col-span-2">
              {worker.readableVotesFor}
            </div>
            <div className="hidden md:block">
              {calculateNeededVotes(worker)}
            </div>
            <div className="col-span-2">
              {begin} - {end}
            </div>
            <div>{worker.readablePay}</div>
            <div>
              <Toggle
                onClick={() => {
                  if (isToggled) {
                    setWorkerVotes((prev) =>
                      prev.filter((v) => v !== worker.vote_for),
                    );
                  } else {
                    setWorkerVotes((prev) => [...prev, worker.vote_for]);
                  }
                }}
                value={isToggled}
              >
                {isToggled ? <Check className="h-4 w-4 text-[hsl(var(--accent-success-fg))]" /> : <X className="h-4 w-4 text-[hsl(var(--accent-danger-fg))]" />}
              </Toggle>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function Witnesses(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true,
  );
  const currentNodeUrl = useStore($currentNodeUrl);
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true,
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const [globalParameters, setGlobalParameters] = useState(null);
  const [dynamicGlobalParameters, setDynamicGlobalParameters] = useState(null);
  const [allWitnesses, setAllWitnesses] = useState([]);
  const [allFetchedAccounts, setAllFetchedAccounts] = useState({});
  const [activeWitnessIds, setActiveWitnessIds] = useState([]);
  const [activeCommitteeMembers, setActiveCommitteeMembers] = useState(null);
  const [allCommitteeMembers, setAllCommitteeMembers] = useState([]);
  const [allWorkerProposals, setAllWorkerProposals] = useState([]);

  const [filter, setFilter] = useState("");

  const [witnessSortKey, setWitnessSortKey] = useState("rank");
  const [witnessSortDirection, setWitnessSortDirection] = useState("asc");

  const [committeeSortKey, setCommitteeSortKey] = useState("votes");
  const [committeeSortDirection, setCommitteeSortDirection] = useState("desc");

  const [workerSortKey, setWorkerSortKey] = useState("votes");
  const [workerSortDirection, setWorkerSortDirection] = useState("desc");

  // 1. Fetch Global and Dynamic Global Parameters
  useEffect(() => {
    if (_chain && currentNodeUrl) {
      async function fetchGlobalParameters() {
        const globalParamsStore = createObjectStore([
          _chain,
          JSON.stringify(["2.0.0", "2.1.0"]), // Fetch both objects
          currentNodeUrl,
        ]);

        globalParamsStore.subscribe(({ data, error, loading: gpLoading }) => {
          if (data && !error && !gpLoading && data.length === 2) {
            setActiveWitnessIds(data[0].active_witnesses);
            setActiveCommitteeMembers(data[0].active_committee_members);
            setGlobalParameters(data[0].parameters);
            setDynamicGlobalParameters(data[1]);
          } else if (error) {
            console.error("Error fetching global parameters:", error);
          }
        });
      }

      fetchGlobalParameters();
    }
  }, [_chain, currentNodeUrl]);

  const [userData, setUserData] = useState(null);
  // 2. Get user votes
  useEffect(() => {
    if (_chain && currentNodeUrl) {
      async function fetchUserVotes() {
        const voteStore = createObjectStore([
          usr.chain,
          JSON.stringify([usr.id]), // Fetch both objects
          currentNodeUrl,
        ]);

        voteStore.subscribe(({ data, error, loading: gpLoading }) => {
          if (data && !error && !gpLoading) {
            setUserData(data[0]);
          } else if (error) {
            console.error("Error fetching user votes:", error);
          }
        });
      }

      if (usr && usr.id) {
        fetchUserVotes();
      }
    }
  }, [usr, currentNodeUrl]);

  // 3. Fetch All Witness Objects (1.6.x)
  useEffect(() => {
    if (_chain && currentNodeUrl && globalParameters) {
      // Ensure globalParameters are loaded first
      async function fetchAllWitnessObjects() {
        const allWitnessStore = createEveryObjectStore([
          _chain,
          1, // space_id
          6, // type_id for witness
          0, // start from beginning
          currentNodeUrl,
        ]);

        allWitnessStore.subscribe(({ data, error, loading: wLoading }) => {
          if (data && !error && !wLoading) {
            let filteredData = data.filter((x) => x); // Filter out null/undefined entries
            if (_chain === "bitshares") {
              // Apply blocklist filter
              filteredData = filteredData.filter(
                (witness) =>
                  !blocklist.users.includes(
                    toHex(sha256(utf8ToBytes(witness.witness_account))),
                  ),
              );
            }
            setAllWitnesses(filteredData);
          } else if (error) {
            console.error("Error fetching all witnesses:", error);
          }
        });
      }

      fetchAllWitnessObjects();
    }
  }, [currentNodeUrl, globalParameters, blocklist, _chain]); // Added blocklist and _chain dependency

  // 4. Fetch All Committee Member Objects (1.5.x)
  useEffect(() => {
    async function fetchAllCommitteeMembers() {
      if (_chain && currentNodeUrl) {
        const allCommitteeStore = createEveryObjectStore([
          _chain,
          1, // space_id for protocol objects
          5, // type_id for committee_member
          0, // start from beginning
          currentNodeUrl,
        ]);
        allCommitteeStore.subscribe(({ data, error, loading: cmLoading }) => {
          if (data && !error && !cmLoading) {
            let filteredData = data.filter((x) => x); // Filter out null/undefined entries
            if (_chain === "bitshares") {
              // Apply blocklist filter
              filteredData = filteredData.filter(
                (comm) =>
                  !blocklist.users.includes(
                    toHex(sha256(utf8ToBytes(comm.committee_member_account))),
                  ),
              );
            }
            setAllCommitteeMembers(filteredData);
          } else if (error) {
            console.error("Error fetching all committee members:", error);
          }
        });
      }
    }

    fetchAllCommitteeMembers();
  }, [currentNodeUrl, blocklist, _chain]); // Added blocklist and _chain dependency

  // 5. Fetch all worker proposals (1.14.x)
  useEffect(() => {
    async function fetchAllWorkerProposals() {
      if (_chain && currentNodeUrl) {
        const allWorkerProposalStore = createEveryObjectStore([
          _chain,
          1, // space_id for protocol objects
          14, // type_id for worker proposals
          0, // start from beginning
          currentNodeUrl,
        ]);
        allWorkerProposalStore.subscribe(
          ({ data, error, loading: cmLoading }) => {
            if (data && !error && !cmLoading) {
              let filteredData = data.filter((x) => x); // Filter out null/undefined entries
              if (_chain === "bitshares") {
                // Apply blocklist filter
                filteredData = filteredData.filter(
                  (comm) =>
                    !blocklist.users.includes(
                      toHex(sha256(utf8ToBytes(comm.worker_account))),
                    ),
                );
              }
              setAllWorkerProposals(filteredData);
            } else if (error) {
              console.error("Error fetching all worker proposals:", error);
            }
          },
        );
      }
    }

    fetchAllWorkerProposals();
  }, [currentNodeUrl, blocklist, _chain]); // Added blocklist and _chain dependency

  // 6. Fetch Account Objects (1.2.x) for all witnesses
  useEffect(() => {
    if (
      _chain &&
      currentNodeUrl &&
      allWitnesses.length > 0 &&
      allCommitteeMembers.length > 0 &&
      allWorkerProposals.length > 0
    ) {
      async function fetchWitnessAccounts() {
        const _witnessAccountIDs = allWitnesses.map((w) => w.witness_account);
        const uniqueWitnessAccountIds = [...new Set(_witnessAccountIDs)];
        const _committeeMmberAccountIDs = allCommitteeMembers.map(
          (cm) => cm.committee_member_account,
        );
        const uniqueCommitteeAccountIds = [
          ...new Set(_committeeMmberAccountIDs),
        ];

        const _workerAccountIDs = allWorkerProposals.map(
          (wp) => wp.worker_account,
        );
        const uniqueWorkerAccountIds = [...new Set(_workerAccountIDs)];

        const combineIds = [
          ...uniqueWitnessAccountIds,
          ...uniqueCommitteeAccountIds,
          ...uniqueWorkerAccountIds,
        ];

        const uniqueAccountIds = [...new Set(combineIds)];

        const accountsStore = createObjectStore([
          _chain,
          JSON.stringify(uniqueAccountIds),
          currentNodeUrl,
        ]);

        accountsStore.subscribe(({ data, error, loading: accLoading }) => {
          if (data && !error && !accLoading) {
            const accountsMap = data.reduce((acc, account) => {
              if (account) {
                acc[account.id] = account;
              }
              return acc;
            }, {});
            setAllFetchedAccounts(accountsMap);
          } else if (error) {
            console.error("Error fetching witness accounts:", error);
          }
        });
      }

      fetchWitnessAccounts();
    }
  }, [
    _chain,
    currentNodeUrl,
    allWitnesses,
    allCommitteeMembers,
    allWorkerProposals,
  ]); // Depends on allWitnesses & globals

  const processedWitnesses = useMemo(() => {
    if (
      !allWitnesses ||
      !allFetchedAccounts ||
      Object.keys(allFetchedAccounts).length === 0 ||
      !activeWitnessIds
    ) {
      return [];
    }
    return allWitnesses
      .map((w) => {
        const account = allFetchedAccounts[w.witness_account];
        if (!account) return null; // Skip if account data not yet fetched

        return {
          ...w,
          //id: w.id,
          account_id: w.witness_account,
          name: account.name,
          total_votes: parseInt(w.total_votes, 10),
          active: activeWitnessIds.includes(w.id),
        };
      })
      .filter(Boolean) // Remove null entries
      .filter((witness) =>
        witness.name.toLowerCase().includes(filter.toLowerCase()),
      ); // Apply filter
  }, [allWitnesses, allFetchedAccounts, activeWitnessIds, filter]);

  const processedCommitteeMembers = useMemo(() => {
    return allCommitteeMembers
      .map((cm) => {
        const account = allFetchedAccounts[cm.committee_member_account];
        if (!account) return null;
        return {
          ...cm,
          //id: cm.id,
          account_id: cm.committee_member_account,
          name: account.name,
          total_votes: parseInt(cm.total_votes, 10),
          active: activeCommitteeMembers.includes(cm.id),
        };
      })
      .filter(Boolean) // Remove null entries
      .filter((member) =>
        member.name.toLowerCase().includes(filter.toLowerCase()),
      );
  }, [allCommitteeMembers, allFetchedAccounts, activeCommitteeMembers, filter]);

  const processedWorkerProposals = useMemo(() => {
    if (
      !allWorkerProposals ||
      !allFetchedAccounts ||
      Object.keys(allFetchedAccounts).length === 0
    ) {
      console.log("Worker proposals data not ready yet.");
      return [];
    }

    return allWorkerProposals
      .map((wp) => {
        const account = allFetchedAccounts[wp.worker_account];
        if (!account) {
          return null;
        }

        if (wp.name.includes("poll") || wp.name.includes("bsip")) {
          return null; // Skip polls and BSIPs
        }

        const _endDate = new Date(wp.work_end_date + "Z");
        const now = new Date();
        if (_endDate < now) {
          return null; // Skip all expired proposals
        }

        return {
          ...wp,
          username: account.name,
          readablePay: humanReadableFloat(parseInt(wp.daily_pay), 5),
          readableVotesFor: humanReadableFloat(wp.total_votes_for, 5),
          readableVotesAgainst: humanReadableFloat(wp.total_votes_against, 5),
          needed: 0,
        };
      })
      .filter(Boolean) // Remove null entries
      .filter((member) =>
        member.name.toLowerCase().includes(filter.toLowerCase()),
      );
  }, [allWorkerProposals, allFetchedAccounts, filter]);

  const budgetConsumers = useMemo(() => {
    if (!processedWorkerProposals || !processedWorkerProposals.length) {
      return [];
    }

    let _budgetConsumers = [];
    let _consumedBudget = 0;
    let dailyBudget = 400000; // TODO: Fetch from global parameters

    const sortedProposals = [...processedWorkerProposals].sort((a, b) => {
      return b.readableVotesFor - a.readableVotesFor;
    });

    for (let i = 0; i < sortedProposals.length; i++) {
      const wp = sortedProposals[i];
      let processedPay = wp.readablePay;
      if (_consumedBudget >= dailyBudget) {
        break; // Stop if budget is exhausted
      }

      const _budgetToConsume = _consumedBudget + processedPay;
      if (_budgetToConsume > dailyBudget) {
        // If requested daily pay exceeds remaining budget, reduce daily pay to remainder (partial payment)
        processedPay = dailyBudget - _consumedBudget;
      }

      _budgetConsumers.push({
        id: wp.id,
        daily_pay: processedPay,
        total_votes_for: wp.readableVotesFor,
      });

      _consumedBudget += processedPay;
    }
    return _budgetConsumers;
  }, [processedWorkerProposals]);

  const consumedBudget = useMemo(() => {
    let total = 0;
    budgetConsumers.forEach((bc) => {
      total += bc.daily_pay;
    });
    return total;
  }, [budgetConsumers]);

  const budgetConsumerSet = useMemo(() => new Set(budgetConsumers.map((bc) => bc.id)), [budgetConsumers]);

  const sortedWitnesses = useMemo(() => {
    const sorted = [...processedWitnesses].sort((a, b) => {
      if (witnessSortKey === "name") return a.name.localeCompare(b.name);
      if (witnessSortKey === "votes") return a.total_votes - b.total_votes;
      if (witnessSortKey === "rank") return b.total_votes - a.total_votes;
      return 0;
    });
    if (witnessSortDirection === "desc") {
      return sorted.slice().reverse();
    }
    return sorted;
  }, [processedWitnesses, witnessSortKey, witnessSortDirection]);

  const sortedMembers = useMemo(() => {
    const sorted = [...processedCommitteeMembers].sort((a, b) => {
      if (committeeSortKey === "name") {
        return committeeSortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (committeeSortKey === "votes") {
        return committeeSortDirection === "asc"
          ? a.total_votes - b.total_votes
          : b.total_votes - a.total_votes;
      }
      return 0; // Default case (shouldn't happen)
    });
    return sorted;
  }, [processedCommitteeMembers, committeeSortKey, committeeSortDirection]);

  const sortedWorkers = useMemo(() => {
    // id, votes, needed, daily pay
    const sorted = [...processedWorkerProposals].sort((a, b) => {
      if (workerSortKey === "name") {
        return workerSortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (workerSortKey === "votes") {
        return workerSortDirection === "asc"
          ? a.readableVotesFor - b.readableVotesFor
          : b.readableVotesFor - a.readableVotesFor;
      } else if (workerSortKey === "daily_pay") {
        return workerSortDirection === "asc"
          ? a.readablePay - b.readablePay
          : b.readablePay - a.readablePay;
      }
      return 0; // Default case (shouldn't happen)
    });
    return sorted;
  }, [processedWorkerProposals, workerSortKey, workerSortDirection]);

  const handleWitnessSort = (key) => {
    if (witnessSortKey === key) {
      setWitnessSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setWitnessSortKey(key);
      setWitnessSortDirection("asc"); // Default to asc when changing column
    }
  };

  const handleCommitteeSort = (key) => {
    if (committeeSortKey === key) {
      setCommitteeSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCommitteeSortKey(key);
      setCommitteeSortDirection("asc"); // Default to asc when changing column
    }
  };

  const handleWorkerSort = (key) => {
    if (workerSortKey === key) {
      setWorkerSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setWorkerSortKey(key);
      setWorkerSortDirection("asc"); // Default to asc when changing column
    }
  };

  const debouncedFilterChange = useCallback(
    debounce((value) => {
      setFilter(value);
    }, 300),
    [],
  );

  const calculateNeededVotes = useCallback((_workerProposal) => {
    let totalVotesNeeded = 0;
    let remainingBudget = 400000 - consumedBudget;
    const requiredPay = humanReadableFloat(
      parseInt(_workerProposal.daily_pay),
      5,
    );
    for (let i = budgetConsumers.length - 1; i >= 0; i--) {
      const bc = budgetConsumers[i];
      const bcPay = bc.daily_pay;
      remainingBudget += bcPay;
      totalVotesNeeded = bc.total_votes_for + 1; // +1 to surpass

      if (remainingBudget >= requiredPay) {
        break;
      }
    }
    return totalVotesNeeded - _workerProposal.readableVotesFor;
  }, [budgetConsumers, consumedBudget]);

  const [committeeVotes, setCommitteeVotes] = useState([]);
  const [witnessVotes, setWitnessVotes] = useState([]);
  const [workerVotes, setWorkerVotes] = useState([]);
  const [checkedVotes, setCheckedVotes] = useState(false);
  useEffect(() => {
    if (!userData) return;
    // Once userData is available, parse existing votes
    const votes = userData.options.votes;
    // "0:" = committee
    // "1:" = witness
    // "2:" = worker
    const _committeeVotes = votes.filter(
      (v) => typeof v === "string" && v.startsWith("0:"),
    );
    const _witnessVotes = votes.filter(
      (v) => typeof v === "string" && v.startsWith("1:"),
    );
    const _workerVotes = votes.filter(
      (v) => typeof v === "string" && v.startsWith("2:"),
    );
    setCommitteeVotes(_committeeVotes);
    setWitnessVotes(_witnessVotes);
    setWorkerVotes(_workerVotes);
    setCheckedVotes(true);
  }, [userData]);

  const trxJSON = useMemo(() => {
    if (!usr || !userData) {
      return;
    }
    return {
      account: usr.id,
      new_options: {
        memo_key: userData.options.memo_key,
        voting_account: usr.id,
        num_witness: witnessVotes.length,
        num_committee: committeeVotes.length,
        votes: [...committeeVotes, ...witnessVotes, ...workerVotes],
      },
      extensions: {},
    };
  }, [usr, userData, committeeVotes, witnessVotes, workerVotes]);

  const witnessRowProps = useMemo(() => ({ sortedWitnesses, witnessVotes, setWitnessVotes, _chain }), [sortedWitnesses, witnessVotes, setWitnessVotes, _chain]);
  const committeeRowProps = useMemo(() => ({ sortedMembers, committeeVotes, setCommitteeVotes, _chain }), [sortedMembers, committeeVotes, setCommitteeVotes, _chain]);
  const workerRowProps = useMemo(() => ({ sortedWorkers, workerVotes, setWorkerVotes, budgetConsumerSet, calculateNeededVotes, _chain }), [sortedWorkers, workerVotes, setWorkerVotes, budgetConsumerSet, calculateNeededVotes, _chain]);

  const [selectedVoteType, setSelectedVoteType] = useState("witnesses"); // witnesses, committee, workers
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="container mx-auto mt-5 mb-5">
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-1)/0.2)] blur-3xl" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] via-[hsl(var(--accent-2)/0.7)] to-[hsl(var(--accent-1)/0.7)]" />
        <CardHeader className="pb-0">
          <CardTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
            <Vote className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
            {t("Voting:title")}
          </CardTitle>
          <CardDescription>{t("Voting:description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <Input
            placeholder={t("Witnesses:filterPlaceholder")}
            onChange={(e) => debouncedFilterChange(e.target.value)}
            className="mb-4 w-full md:w-1/3 border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
          />
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Button
              className={selectedVoteType === "witnesses" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.3)] transition-all duration-200" : "text-muted-foreground hover:text-foreground border-border hover:bg-accent/50 transition-colors"}
              onClick={() => setSelectedVoteType("witnesses")}
            >
              {t("Voting:tabs.witnesses")}
            </Button>
            <Button
              className={selectedVoteType === "committee" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.3)] transition-all duration-200" : "text-muted-foreground hover:text-foreground border-border hover:bg-accent/50 transition-colors"}
              onClick={() => setSelectedVoteType("committee")}
            >
              {t("Voting:tabs.committee")}
            </Button>
            <Button
              className={selectedVoteType === "workers" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.3)] transition-all duration-200" : "text-muted-foreground hover:text-foreground border-border hover:bg-accent/50 transition-colors"}
              onClick={() => setSelectedVoteType("workers")}
            >
              {t("Voting:tabs.workers")}
            </Button>
          </div>

          {selectedVoteType === "witnesses" ? (
            <div className="w-full">
              <div className="grid grid-cols-4 gap-2 p-2 bg-gradient-to-r from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-2)/0.1)] rounded-t-md font-semibold text-sm">
                <div
                  className="cursor-pointer"
                  onClick={() => handleWitnessSort("name")}
                >
                  {t("Witnesses:name")}{" "}
                  {witnessSortKey === "name"
                    ? witnessSortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div>{t("Witnesses:ids")}</div>
                <div onClick={() => handleWitnessSort("votes")}>
                  {t("Witnesses:votes")}{" "}
                  {witnessSortKey === "votes"
                    ? witnessSortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div>{t("Voting:toggleVote")}</div>
              </div>
              <div className="w-full h-[500px]">
                {sortedWitnesses && sortedWitnesses.length && checkedVotes ? (
                  <List
                    height={500}
                    width="100%"
                    rowComponent={WitnessRow}
                    rowCount={sortedWitnesses.length}
                    rowHeight={75}
                    rowProps={witnessRowProps}
                  />
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {selectedVoteType === "committee" ? (
            <div className="w-full">
              <div className="grid grid-cols-4 gap-2 p-2 bg-gradient-to-r from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-2)/0.1)] rounded-t-md font-semibold text-sm">
                <div onClick={() => handleCommitteeSort("name")}>
                  {t("CommitteeMembers:name")}{" "}
                  {committeeSortKey === "name"
                    ? committeeSortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div>{t("CommitteeMembers:ids")}</div>
                <div onClick={() => handleCommitteeSort("votes")}>
                  {t("CommitteeMembers:votes")}{" "}
                  {committeeSortKey === "votes"
                    ? committeeSortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div>{t("Voting:toggleVote")}</div>
              </div>
              <div className="w-full h-[500px]">
                {sortedWitnesses && sortedWitnesses.length && checkedVotes ? (
                  <List
                    height={500}
                    width="100%"
                    rowComponent={CommitteeRow}
                    rowCount={sortedMembers.length}
                    rowHeight={75}
                    rowProps={committeeRowProps}
                  />
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {selectedVoteType === "workers" ? (
            <div className="w-full">
              <div className="grid grid-cols-8 md:grid-cols-12 gap-2 p-2 bg-gradient-to-r from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-2)/0.1)] rounded-t-md font-semibold text-sm">
                <div>{t("Voting:workers.active")}</div>
                <div className="hidden md:block">
                  {t("CommitteeMembers:ids")}
                </div>
                <div
                  className="col-span-3"
                  onClick={() => handleWorkerSort("name")}
                >
                  {t("CommitteeMembers:name")}{" "}
                  {workerSortKey === "name"
                    ? workerSortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div
                  className="col-span-2 hidden md:block"
                  onClick={() => handleWorkerSort("votes")}
                >
                  {t("CommitteeMembers:votes")}{" "}
                  {workerSortKey === "votes"
                    ? workerSortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div className="hidden md:block">
                  {t("Voting:workers.needed")}
                </div>
                <div className="col-span-2">{t("Voting:workers.duration")}</div>
                <div>
                  {t("Voting:workers.dailyPay", {
                    symbol: _chain === "bitshares" ? "BTS" : "TEST",
                  })}
                </div>
                <div>{t("Voting:toggleVote")}</div>
              </div>
              <div className="w-full h-[500px]">
                {sortedWorkers && sortedWorkers.length && checkedVotes ? (
                  <List
                    height={500}
                    width="100%"
                    rowComponent={WorkerRow}
                    rowCount={sortedWorkers.length}
                    rowHeight={75}
                    rowProps={workerRowProps}
                  />
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:shadow-[color:hsl(var(--accent-1)/0.4)] active:scale-95 transition-all duration-200 cursor-pointer" onClick={() => setShowDialog(true)} disabled={!checkedVotes}>
            {t("Voting:submit")}
          </Button>
        </CardFooter>
      </Card>
      <Card className="mt-5 w-full md:w-1/2 mx-auto relative overflow-hidden border-[hsl(var(--accent-2)/0.15)] bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-2)/0.1)]">
        <div className="pointer-events-none absolute -top-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-3)/0.2)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-[hsl(var(--accent-3)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[hsl(var(--accent-2)/0.5)] via-[hsl(var(--accent-3)/0.5)] to-[hsl(var(--accent-2)/0.5)]" />
        <Empty className="mt-5">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Ticket className="h-10 w-10 text-[hsl(var(--accent-2-fg))]" /></EmptyMedia>
            <EmptyTitle>{t("Voting:ticket.title")}</EmptyTitle>
            <EmptyDescription>
              {t("Voting:ticket.descriptionLine1")}
              <br />
              {t("Voting:ticket.descriptionLine2")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-2-gradFg))] shadow-md shadow-[color:hsl(var(--accent-2)/0.2)] hover:from-[hsl(var(--accent-2))] hover:to-[hsl(var(--accent-3))] hover:shadow-[color:hsl(var(--accent-2)/0.4)] active:scale-95 transition-all duration-200 cursor-pointer">
              <a href="/create_ticket.html">
                {t("Voting:ticket.createButton")}
              </a>
            </Button>
          </EmptyContent>
        </Empty>
      </Card>
      {showDialog ? (
        <DeepLinkDialog
          operationNames={["account_update"]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`VotingDialog`}
          headerText={t("Voting:headerText")}
          trxJSON={[trxJSON]}
        />
      ) : null}
    </div>
  );
}
