import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";

import {
  Card,
  CardContent,
  CardDescription,
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

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Avatar } from "@/components/Avatar.tsx"; // Re-using existing component

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import {
  createObjectStore,
  createEveryObjectStore,
} from "@/nanoeffects/Objects.ts";
import { createUsersCoreBalanceStore } from "@/nanoeffects/UserBalances.js";
import { useInitCache } from "@/nanoeffects/Init.ts";

import { humanReadableFloat, debounce } from "@/lib/common";
import ExternalLink from "./common/ExternalLink.jsx";

export default function CommitteeMembers(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const [allCommitteeMembers, setAllCommitteeMembers] = useState([]);
  const [committeeAccounts, setCommitteeAccounts] = useState({}); // Store account details keyed by account ID
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState("votes"); // name, votes
  const [sortDirection, setSortDirection] = useState("desc"); // asc, desc

  const [activeCommitteeMembers, setActiveCommitteeMembers] = useState(null);

  // 1. Fetch Global Parameters (for active committee list)
  useEffect(() => {
    let unsubscribe;
    if (usr && usr.chain && currentNode) {
      const globalParamsStore = createObjectStore([
        usr.chain,
        JSON.stringify(["2.0.0"]),
        currentNode.url,
      ]);
      unsubscribe = globalParamsStore.subscribe(
        ({ data, error, loading: gpLoading }) => {
          if (data && !error && !gpLoading && data[0]) {
            setActiveCommitteeMembers(data[0].active_committee_members);
          } else if (error) {
            console.error("Error fetching global parameters:", error);
          }
        }
      );
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usr, currentNode]);

  // 2. Fetch All Committee Member Objects (1.5.x)
  useEffect(() => {
    let unsubscribe;
    if (usr && usr.chain && currentNode) {
      const allCommitteeStore = createEveryObjectStore([
        usr.chain,
        1, // space_id for protocol objects
        5, // type_id for committee_member
        0, // start from beginning
        currentNode.url,
      ]);
      unsubscribe = allCommitteeStore.subscribe(
        ({ data, error, loading: cmLoading }) => {
          if (data && !error && !cmLoading) {
            let filteredData = data.filter((x) => x); // Filter out null/undefined entries
            if (_chain === "bitshares") {
              // Apply blocklist filter
              filteredData = filteredData.filter(
                (comm) =>
                  !blocklist.users.includes(
                    toHex(sha256(utf8ToBytes(comm.committee_member_account)))
                  )
              );
            }
            setAllCommitteeMembers(filteredData);
          } else if (error) {
            console.error("Error fetching all committee members:", error);
          }
        }
      );
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usr, currentNode, blocklist, _chain]); // Added blocklist and _chain dependency

  // 3. Fetch Account Objects (1.2.x) for all committee members
  useEffect(() => {
    let unsubscribe;
    if (usr && usr.chain && currentNode && allCommitteeMembers.length > 0) {
      const accountIds = allCommitteeMembers.map(
        (cm) => cm.committee_member_account
      );
      const uniqueAccountIds = [...new Set(accountIds)];

      // Fetch in chunks if necessary, though createObjectStore handles arrays
      const accountsStore = createObjectStore([
        usr.chain,
        JSON.stringify(uniqueAccountIds),
        currentNode.url,
      ]);

      unsubscribe = accountsStore.subscribe(
        ({ data, error, loading: accLoading }) => {
          if (data && !error && !accLoading) {
            const accountsMap = data.reduce((acc, account) => {
              if (account) {
                // Ensure account data is not null
                acc[account.id] = account;
              }
              return acc;
            }, {});
            setCommitteeAccounts(accountsMap);
            setLoading(false); // Set loading to false only after accounts are fetched
          } else if (error) {
            console.error("Error fetching committee accounts:", error);
            setLoading(false);
          }
        }
      );
    } else if (allCommitteeMembers.length === 0 && !loading) {
      setLoading(false); // Stop loading if there are no members to fetch accounts for
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usr, currentNode, allCommitteeMembers]); // depends on allCommitteeMembers

  const processedMembers = useMemo(() => {
    return allCommitteeMembers
      .map((cm) => {
        const account = committeeAccounts[cm.committee_member_account];
        if (!account) return null; // Skip if account data not yet fetched
        return {
          id: cm.id,
          account_id: cm.committee_member_account,
          name: account.name,
          total_votes: parseInt(cm.total_votes, 10), // Ensure votes are numbers for sorting
          active: activeCommitteeMembers.includes(cm.id),
        };
      })
      .filter(Boolean) // Remove null entries
      .filter((member) =>
        member.name.toLowerCase().includes(filter.toLowerCase())
      ); // Apply filter
  }, [allCommitteeMembers, committeeAccounts, activeCommitteeMembers, filter]);

  const [coreBalances, setCoreBalances] = useState();
  useEffect(() => {
    // fetch committee member core balances
    let unsubscribe;
    if (usr && usr.chain && currentNode && committeeAccounts) {
      const accountIds = Object.keys(committeeAccounts);
      const uniqueAccountIds = [...new Set(accountIds)];

      const coreBalancesStore = createUsersCoreBalanceStore([
        usr.chain,
        JSON.stringify(uniqueAccountIds),
        currentNode.url,
      ]);

      unsubscribe = coreBalancesStore.subscribe(({ data, error }) => {
        if (data && !error) {
          setCoreBalances(data);
        } else if (error) {
          console.error("Error fetching core balances:", error);
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentNode, committeeAccounts]);

  const sortedMembers = useMemo(() => {
    const sorted = [...processedMembers].sort((a, b) => {
      if (sortKey === "name") {
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortKey === "votes") {
        return sortDirection === "asc"
          ? a.total_votes - b.total_votes
          : b.total_votes - a.total_votes;
      }
      return 0; // Default case (shouldn't happen)
    });
    return sorted;
  }, [processedMembers, sortKey, sortDirection]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc"); // Default to asc when changing column
    }
  };

  const debouncedFilterChange = useCallback(
    debounce((value) => {
      setFilter(value);
    }, 300),
    []
  );

  const CommitteeRow = ({ index, style }) => {
    const member = sortedMembers[index];
    if (!member) return null;

    const foundBalance = coreBalances
      ? coreBalances.find((balance) => balance.id === member.account_id)
      : null;

    const coreTokenBalance = foundBalance ? foundBalance.balance[0].amount : 0;

    const humanReadableBalance = humanReadableFloat(
      coreTokenBalance,
      5
    ).toLocaleString(undefined, { minimumFractionDigits: 5 });

    const votes = committeeAccounts[member.account_id]?.options.votes || [];
    const filteredVotes = votes.filter((x) => parseInt(x.split(":")[0]) === 0);

    const LightMemberRow = ({ index, style }) => {
      const currentVote = filteredVotes[index];
      if (!currentVote) return null;

      const foundMember = Object.values(allCommitteeMembers).find(
        (w) => w.vote_id === currentVote
      );

      const account =
        committeeAccounts && foundMember
          ? committeeAccounts[foundMember.committee_member_account]
          : null; // Find the account for the current vote

      const accountName = account ? account.name : "unknown";

      return (
        <div style={style} key={`vote${currentVote}`}>
          <Card className={`mb-1 ${member.active ? "bg-green-100" : ""}`}>
            <CardContent className="pt-3 pb-3 text-sm">
              <div className="col-span-3 flex items-center">
                <Avatar
                  size={30}
                  name={accountName}
                  extra={`WL${index}`}
                  expression={{ eye: "normal", mouth: "open" }}
                  colors={[
                    "#F0AB3D",
                    "#C271B4",
                    "#C20D90",
                    "#92A1C6",
                    "#146A7C",
                  ]}
                />
                <span className="ml-2">{accountName}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    };

    return (
      <div style={style} key={member.id}>
        <Dialog>
          <DialogTrigger asChild>
            <Card className={`mb-1 ${member.active ? "bg-green-100" : ""}`}>
              <CardContent className="pt-3 pb-3 text-sm">
                <div className="grid grid-cols-4 gap-2 items-center">
                  <div className="flex items-center">
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
                    <span className="ml-2">{member.name}</span>
                  </div>
                  <div>
                    <ExternalLink
                      classnamecontents="text-blue-500 hover:text-purple-500"
                      type="text"
                      text={member.id}
                      hyperlink={`https://blocksights.info/#/objects/${
                        member.id
                      }${_chain === "bitshares" ? "" : "?network=testnet"}`}
                    />{" "}
                    (
                    <ExternalLink
                      classnamecontents="text-blue-500 hover:text-purple-500"
                      type="text"
                      text={member.account_id}
                      hyperlink={`https://blocksights.info/#/accounts/${
                        member.account_id
                      }${_chain === "bitshares" ? "" : "?network=testnet"}`}
                    />
                    )
                  </div>
                  <div className="text-right pr-3">
                    {humanReadableBalance} BTS
                  </div>
                  <div className="text-right pr-3">
                    {humanReadableFloat(member.total_votes, 5).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 5 }
                    )}{" "}
                    BTS
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("CommitteeMembers:votesFor", { name: member.name })}:
              </DialogTitle>
              <DialogDescription>
                {t("CommitteeMembers:descriptionVotes")}
              </DialogDescription>
            </DialogHeader>
            {filteredVotes &&
            filteredVotes.length > 0 &&
            allCommitteeMembers ? (
              <ScrollArea className="h-[500px] pt-1">
                <List
                  height={500}
                  rowComponent={LightMemberRow}
                  rowCount={filteredVotes.length}
                  rowHeight={75} // Adjust as needed
                  rowProps={{}}
                  width="100%"
                />
              </ScrollArea>
            ) : (
              <div className="text-red-500 text-center">N/A</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("CommitteeMembers:title")}</CardTitle>
          <CardDescription>{t("CommitteeMembers:description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={t("CommitteeMembers:filterPlaceholder")}
            onChange={(e) => debouncedFilterChange(e.target.value)}
            className="mb-4 w-full md:w-1/3"
          />
          {loading ||
          !sortedMembers ||
          !sortedMembers.length ||
          !coreBalances ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="w-full">
              <div className="grid grid-cols-4 gap-2 p-2 bg-gray-100 rounded-t-md font-semibold text-sm sticky top-0 z-10">
                <div
                  className="cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  {t("CommitteeMembers:name")}{" "}
                  {sortKey === "name"
                    ? sortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div>{t("CommitteeMembers:ids")}</div>
                <div className="text-right">
                  {t("CommitteeMembers:coreTokenBalance")}
                </div>
                <div
                  className="text-right pr-3 cursor-pointer"
                  onClick={() => handleSort("votes")}
                >
                  {t("CommitteeMembers:votes")}{" "}
                  {sortKey === "votes"
                    ? sortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
              </div>
              <ScrollArea className="h-[500px]">
                <List
                  height={500}
                  rowComponent={CommitteeRow}
                  rowCount={sortedMembers.length}
                  rowHeight={65} // Adjust based on content height
                  rowProps={{}}
                  width="100%"
                />
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
