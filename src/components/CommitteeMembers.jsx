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
import { Users, ArrowUpDown, SlidersHorizontal, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
import { Avatar } from "@/components/Avatar.tsx"; // Re-using existing component

import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import {
  createObjectStore,
  createEveryObjectStore,
} from "@/nanoeffects/Objects.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";

import { humanReadableFloat, debounce } from "@/lib/common";
import ExternalLink from "./common/ExternalLink.jsx";

const LightMemberRow = React.memo(function LightMemberRow({
  index,
  style,
  filteredVotes,
  committeeAccounts,
  voteIdToCommitteeMap,
  isActive,
}) {
  const currentVote = filteredVotes[index];
  if (!currentVote) return null;

  const foundMember = voteIdToCommitteeMap.get(currentVote);
  if (!foundMember) return null;

  const account =
    committeeAccounts && foundMember
      ? committeeAccounts[foundMember.committee_member_account]
      : null;

  const accountName = account ? account.name : "unknown";

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={`vote${currentVote}`}>
      <Card className={`relative overflow-hidden py-0 gap-0 h-full justify-center rounded-xl border ${isActive ? "border-[hsl(var(--accent-success)/0.2)] bg-[hsl(var(--accent-success)/0.05)]" : "border-[hsl(var(--accent-2)/0.15)] bg-card/60"} backdrop-blur-xl shadow-sm hover:border-[hsl(var(--accent-2)/0.25)] transition-all duration-300`}>
      <div className="p-3 text-sm">
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
      </div>
      </Card>
    </div>
  );
});

const CommitteeRow = React.memo(function CommitteeRow({
  index,
  style,
  sortedMembers,
  committeeAccounts,
  voteIdToCommitteeMap,
  t,
  _chain,
}) {
  const member = sortedMembers[index];
  if (!member) return null;

  const votes = committeeAccounts[member.account_id]?.options.votes || [];
  const filteredVotes = votes.filter((x) => parseInt(x.split(":")[0]) === 0);

  const innerRowProps = useMemo(
    () => ({
      filteredVotes,
      committeeAccounts,
      voteIdToCommitteeMap,
      isActive: member.active,
    }),
    [filteredVotes, committeeAccounts, voteIdToCommitteeMap, member.active]
  );

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={member.id}>
      <Dialog>
        <DialogTrigger asChild>
          <Card className={`relative overflow-hidden py-0 gap-0 h-full justify-center rounded-xl border ${member.active ? "border-[hsl(var(--accent-success)/0.2)] bg-[hsl(var(--accent-success)/0.05)]" : "border-[hsl(var(--accent-2)/0.15)] bg-card/60"} backdrop-blur-xl shadow-sm hover:border-[hsl(var(--accent-2)/0.25)] transition-all duration-300`}>
            <div className="p-3 text-sm">
              <div className="grid grid-cols-3 gap-2 items-center">
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
                <div className="text-muted-foreground">
                  {member.id}
                  {" ("}
                  {member.account_id}
                  {")"}
                </div>
                <div className="text-right pr-3">
                  {humanReadableFloat(member.total_votes, 5).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                  )}
                  {_chain === "bitshares" ? " BTS" : " TEST"}
                </div>
              </div>
            </div>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] bg-card/60 backdrop-blur-xl border-[hsl(var(--accent-2)/0.15)]">
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
          committeeAccounts ? (
            <div className="w-full h-[400px]">
              <List
                rowComponent={LightMemberRow}
                rowCount={filteredVotes.length}
                rowHeight={75}
                rowProps={innerRowProps}
                height={400}
                width="100%"
              />
            </div>
          ) : (
            <div className="text-[hsl(var(--accent-danger-fg))] text-center">N/A</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default function CommitteeMembers(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNodeUrl = useStore($currentNodeUrl);
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
    async function fetchGlobalParams() {
      if (usr && usr.chain && currentNodeUrl) {
        const globalParamsStore = createObjectStore([
          usr.chain,
          JSON.stringify(["2.0.0"]),
          currentNodeUrl,
        ]);
        globalParamsStore.subscribe(({ data, error, loading: gpLoading }) => {
          if (data && !error && !gpLoading && data[0]) {
            setActiveCommitteeMembers(data[0].active_committee_members);
          } else if (error) {
            console.error("Error fetching global parameters:", error);
          }
        });
      }
    }

    fetchGlobalParams();
  }, [usr, currentNodeUrl]);

  // 2. Fetch All Committee Member Objects (1.5.x)
  useEffect(() => {
    async function fetchAllCommitteeMembers() {
      if (usr && usr.chain && currentNodeUrl) {
        const allCommitteeStore = createEveryObjectStore([
          usr.chain,
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
                    toHex(sha256(utf8ToBytes(comm.committee_member_account)))
                  )
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
  }, [usr, currentNodeUrl, blocklist, _chain]); // Added blocklist and _chain dependency

  // 3. Fetch Account Objects (1.2.x) for all committee members
  useEffect(() => {
    async function fetchCommitteeAccounts() {
      if (usr && usr.chain && currentNodeUrl && allCommitteeMembers.length > 0) {
        const accountIds = allCommitteeMembers.map(
          (cm) => cm.committee_member_account
        );
        const uniqueAccountIds = [...new Set(accountIds)];

        // Fetch in chunks if necessary, though createObjectStore handles arrays
        const accountsStore = createObjectStore([
          usr.chain,
          JSON.stringify(uniqueAccountIds),
          currentNodeUrl,
        ]);

        accountsStore.subscribe(({ data, error, loading: accLoading }) => {
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
        });
      } else if (allCommitteeMembers.length === 0 && !loading) {
        setLoading(false); // Stop loading if there are no members to fetch accounts for
      }
    }

    fetchCommitteeAccounts();
  }, [usr, currentNodeUrl, allCommitteeMembers]); // depends on allCommitteeMembers

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

  const voteIdToCommitteeMap = useMemo(
    () => new Map(allCommitteeMembers.map((cm) => [cm.vote_id, cm])),
    [allCommitteeMembers]
  );

  const committeeRowProps = useMemo(
    () => ({
      sortedMembers,
      committeeAccounts,
      voteIdToCommitteeMap,
      t,
      _chain,
    }),
    [sortedMembers, committeeAccounts, voteIdToCommitteeMap, t, _chain]
  );

  return (
    <div className="container mx-auto mt-5 mb-5">
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-2)/0.2)]">
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-3)/0.2)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-3)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(var(--accent-2)/0.7)] via-[hsl(var(--accent-3)/0.7)] to-[hsl(var(--accent-2)/0.7)]" />
        {/* content */}
        <CardHeader className="pb-0">
          <CardTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] bg-clip-text text-transparent flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-2)/0.3)] to-[hsl(var(--accent-3)/0.3)] border border-[hsl(var(--accent-2)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-2)/0.4)] text-[hsl(var(--accent-2-fg))]">
              <Users className="h-4.5 w-4.5" />
            </span>
            {t("CommitteeMembers:title")}
          </CardTitle>
          <CardDescription>{t("CommitteeMembers:description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
            <Input
              placeholder={t("CommitteeMembers:filterPlaceholder")}
              onChange={(e) => debouncedFilterChange(e.target.value)}
              className="mb-4 w-full md:w-1/3 border-[hsl(var(--accent-2)/0.2)] bg-card/60 focus-visible:ring-[hsl(var(--accent-2)/0.4)] focus-visible:border-[hsl(var(--accent-2)/0.5)]"
            />
          {loading || !sortedMembers || !sortedMembers.length ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="w-full">
              <div className="grid grid-cols-3 gap-2 p-2 bg-gradient-to-r from-[hsl(var(--accent-2)/0.1)] to-[hsl(var(--accent-3)/0.1)] rounded-t-md font-semibold text-sm sticky top-0 z-10">
                <div
                  className="cursor-pointer flex items-center gap-1"
                  onClick={() => handleSort("name")}
                >
                  {t("CommitteeMembers:name")}{" "}
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  {sortKey === "name"
                    ? sortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div>{t("CommitteeMembers:ids")}</div>
                <div
                  className="text-right pr-3 cursor-pointer flex items-center justify-end gap-1"
                  onClick={() => handleSort("votes")}
                >
                  {t("CommitteeMembers:votes")}{" "}
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  {sortKey === "votes"
                    ? sortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
              </div>
              <div className="w-full h-[500px]">
                <List
                  rowComponent={CommitteeRow}
                  rowCount={sortedMembers.length}
                  rowHeight={65}
                  rowProps={committeeRowProps}
                  height={500}
                  width="100%"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden mt-3 border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.12)] via-[hsl(var(--accent-3)/0.06)] to-transparent shadow-lg shadow-[color:hsl(var(--accent-2)/0.15)]">
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-3)/0.2)] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.2)] blur-3xl" />
        <CardContent className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-2)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.3)] to-[hsl(var(--accent-3)/0.3)] text-[hsl(var(--accent-2-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-2)/0.4)]">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t("CommitteeMembers:paramsBannerTitle")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {t("CommitteeMembers:paramsBannerDescription")}
              </p>
            </div>
          </div>
          <Button
            asChild
            className="shrink-0 bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] text-white shadow-[0_8px_28px_-12px_hsl(var(--accent-2)/0.7)] hover:shadow-[0_12px_36px_-12px_hsl(var(--accent-2)/0.9)] transition-all"
          >
            <a href="/committee_parameters.html">
              {t("CommitteeMembers:paramsBannerCta")}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
