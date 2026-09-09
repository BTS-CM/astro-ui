import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";

import { useChainObjectsLive } from "@/hooks/useChainObjectsLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { Eye, ArrowUpDown } from "lucide-react";

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

import { Avatar } from "@/components/Avatar.tsx"; // Re-using existing component

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList } from "@/stores/blocklist.ts";

import { useInitCache } from "@/nanoeffects/Init.ts";
import {
  createObjectStore,
  createEveryObjectStore,
} from "@/nanoeffects/Objects.ts";

import { humanReadableFloat, debounce } from "@/lib/common";
import ExternalLink from "./common/ExternalLink.jsx";

// Helper function to format time difference (replace TimeAgo if not available/desired)
function formatTimeAgo(dateString, t) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.round((now - date) / 1000);

  if (diffInSeconds < 60)
    return t("Witnesses:secondsAgo", { count: diffInSeconds });
  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (diffInMinutes < 60)
    return t("Witnesses:minutesAgo", { count: diffInMinutes });
  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) return t("Witnesses:hoursAgo", { count: diffInHours });
  const diffInDays = Math.round(diffInHours / 24);
  return t("Witnesses:daysAgo", { count: diffInDays });
}

const LightWitnessRow = React.memo(function LightWitnessRow({
  index,
  style,
  filteredVotes,
  witnessAccounts,
  voteIdToWitnessMap,
  isActive,
}) {
  const currentVote = filteredVotes[index];
  if (!currentVote) return null;

  const foundWitness = voteIdToWitnessMap.get(currentVote);
  if (!foundWitness) return null;

  const account = witnessAccounts
    ? witnessAccounts[foundWitness.witness_account]
    : null;

  const accountName = account ? account.name : "unknown";

  return (
    <div style={style} key={`vote${currentVote}`}>
      <Card className={`mb-1 relative overflow-hidden ${isActive ? "border-[hsl(var(--accent-success)/0.2)] bg-[hsl(var(--accent-success)/0.05)]" : "border-[hsl(var(--accent-1)/0.15)] bg-card/60"} backdrop-blur-xl shadow-sm hover:border-[hsl(var(--accent-1)/0.25)] transition-all duration-300`}>
        <CardContent className="p-3 text-sm">
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
});

const WitnessRow = React.memo(function WitnessRow({
  index,
  style,
  sortedWitnesses,
  witnessAccounts,
  voteIdToWitnessMap,
  t,
  _chain,
}) {
  const witness = sortedWitnesses[index];
  if (!witness) return null;

  let missedClass = "text-[hsl(var(--accent-success-fg))] dark:text-[hsl(var(--accent-success-fg))]"; // Default (low missed)
  if (witness.total_missed > 500 && witness.total_missed <= 1250) {
    missedClass = "text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))]";
  } else if (witness.total_missed > 1250 && witness.total_missed <= 2000) {
    missedClass = "text-[hsl(var(--accent-warning-fg))] dark:text-[hsl(var(--accent-warning-fg))]";
  } else if (witness.total_missed > 2000) {
    missedClass = "text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))]";
  }

  const votes = witnessAccounts[witness.account_id]?.options.votes || [];
  const filteredVotes = votes.filter((x) => parseInt(x.split(":")[0]) === 1);

  const innerRowProps = useMemo(
    () => ({
      filteredVotes,
      witnessAccounts,
      voteIdToWitnessMap,
      isActive: witness.active,
    }),
    [filteredVotes, witnessAccounts, voteIdToWitnessMap, witness.active]
  );

  return (
    <div style={style} key={witness.id}>
      <Dialog>
        <DialogTrigger asChild>
          <Card className={`mb-1 relative overflow-hidden ${witness.active ? "border-[hsl(var(--accent-success)/0.2)] bg-[hsl(var(--accent-success)/0.05)]" : "border-[hsl(var(--accent-1)/0.15)] bg-card/60"} backdrop-blur-xl shadow-sm hover:border-[hsl(var(--accent-1)/0.25)] transition-all duration-300`}>
            <CardContent className="p-3 text-sm">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 md:col-span-3 flex items-center">
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
                <div className="col-span-4 md:col-span-2">
                  <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                    {witness.id}
                  </span>{" "}
                  (
                  <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                    {witness.account_id}
                  </span>
                  )
                </div>
                <div className="hidden md:block col-span-3">
                  {witness.last_aslot_time
                    ? formatTimeAgo(witness.last_aslot_time, t)
                    : "N/A"}
                  {witness.last_block_num ? (
                    <>
                      <br />
                      <span className="text-xs">
                        (
                        <span className="text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] hover:text-[hsl(var(--accent-3-fg))] dark:hover:text-[hsl(var(--accent-3-fg))]">
                          #{witness.last_block_num}
                        </span>
                        )
                      </span>
                    </>
                  ) : null}
                </div>
                <div
                  className={`hidden md:block col-span-1 text-center font-medium ${missedClass}`}
                >
                  {witness.total_missed}
                </div>
                <div className="col-span-4 md:col-span-3 text-right pr-3">
                  {humanReadableFloat(witness.total_votes, 5).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                  )}
                  {_chain === "bitshares" ? " BTS" : " TEST"}
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card/60 backdrop-blur-xl border-[hsl(var(--accent-1)/0.15)]">
        <DialogHeader>
          <DialogTitle>
            {t("Witnesses:votesFor", { name: witness.name })}:
          </DialogTitle>
          <DialogDescription>
            {t("Witnesses:descriptionVotes")}
          </DialogDescription>
        </DialogHeader>
        {filteredVotes &&
        filteredVotes.length > 0 &&
        witnessAccounts ? (
          <div className="w-full h-[400px]">
            <List
              rowComponent={LightWitnessRow}
              rowCount={filteredVotes.length}
              rowHeight={75}
              rowProps={innerRowProps}
              height={400}
              width="100%"
            />
          </div>
        ) : (
          <div className="text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))] text-center">N/A</div>
        )}
      </DialogContent>
    </Dialog>
  </div>
  );
});

export default function Witnesses(properties) {
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

  const [globalParameters, setGlobalParameters] = useState(null);
  const [dynamicGlobalParameters, setDynamicGlobalParameters] = useState(null);
  const [allWitnesses, setAllWitnesses] = useState([]);
  const [witnessAccounts, setWitnessAccounts] = useState({});
  const [witnessCoreBalances, setWitnessCoreBalances] = useState([]);
  const [activeWitnessIds, setActiveWitnessIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState("rank"); // rank, name, votes, missed
  const [sortDirection, setSortDirection] = useState("asc"); // asc, desc

  // 1. Fetch Global and Dynamic Global Parameters
  useEffect(() => {
    if (usr && usr.chain && currentNode) {
      setLoading(true); // Start loading when fetching begins

      async function fetchGlobalParameters() {
        const globalParamsStore = createObjectStore([
          usr.chain,
          JSON.stringify(["2.0.0", "2.1.0"]), // Fetch both objects
          currentNode.url,
        ]);

        globalParamsStore.subscribe(({ data, error, loading: gpLoading }) => {
          if (data && !error && !gpLoading && data.length === 2) {
            setActiveWitnessIds(data[0].active_witnesses);
            setGlobalParameters(data[0].parameters);
            setDynamicGlobalParameters(data[1]);
          } else if (error) {
            console.error("Error fetching global parameters:", error);
          }
        });
      }

      fetchGlobalParameters();
    }
  }, [usr, currentNode]);

  // 2. Fetch All Witness Objects (1.6.x)
  useEffect(() => {
    if (usr && usr.chain && currentNode && globalParameters) {
      // Ensure globalParameters are loaded first
      async function fetchAllWitnessObjects() {
        const allWitnessStore = createEveryObjectStore([
          usr.chain,
          1, // space_id
          6, // type_id for witness
          0, // start from beginning
          currentNode.url,
        ]);

        allWitnessStore.subscribe(({ data, error, loading: wLoading }) => {
          if (data && !error && !wLoading) {
            let filteredData = data.filter((x) => x); // Filter out null/undefined entries
            if (_chain === "bitshares") {
              // Apply blocklist filter
              filteredData = filteredData.filter(
                (witness) =>
                  !blocklist.users.includes(
                    toHex(sha256(utf8ToBytes(witness.witness_account)))
                  )
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
  }, [usr, currentNode, globalParameters, blocklist, _chain]); // Added blocklist and _chain dependency

  // 3. Fetch Account Objects (1.2.x) for all witnesses
  useEffect(() => {
    if (usr && usr.chain && currentNode && allWitnesses.length > 0) {
      async function fetchWitnessAccounts() {
        const accountIds = allWitnesses.map((w) => w.witness_account);
        const uniqueAccountIds = [...new Set(accountIds)];

        const accountsStore = createObjectStore([
          usr.chain,
          JSON.stringify(uniqueAccountIds),
          currentNode.url,
        ]);

        accountsStore.subscribe(({ data, error, loading: accLoading }) => {
          if (data && !error && !accLoading) {
            const accountsMap = data.reduce((acc, account) => {
              if (account) {
                acc[account.id] = account;
              }
              return acc;
            }, {});
            setWitnessAccounts(accountsMap);
            // Only set loading to false when all data is fetched
            if (globalParameters && dynamicGlobalParameters) {
              setLoading(false);
            }
          } else if (error) {
            console.error("Error fetching witness accounts:", error);
            setLoading(false);
          }
        });
      }

      fetchWitnessAccounts();
    } else if (
      allWitnesses.length === 0 &&
      globalParameters &&
      dynamicGlobalParameters
    ) {
      // Stop loading if there are no witnesses to fetch accounts for, but globals are loaded
      setLoading(false);
    }
  }, [
    usr,
    currentNode,
    allWitnesses,
    globalParameters,
    dynamicGlobalParameters,
  ]); // Depends on allWitnesses & globals

  // Live subscription: witness objects (1.6.x) update per block
  // (total_missed / last_confirmed_block_num / last_aslot), plus 2.1.0 heartbeat.
  const witnessIds = useMemo(
    () => allWitnesses.map((w) => w.id),
    [allWitnesses]
  );
  const liveWitnessData = useChainObjectsLive({
    chain: _chain,
    ids: witnessIds.length ? [...witnessIds, "2.1.0"] : ["2.1.0"],
    enabled: Boolean(_chain && allWitnesses.length > 0),
    specificNode: currentNode ? currentNode.url : null,
  });
  const liveWitnessMap = useMemo(
    () =>
      liveWitnessData.objects
        ? new Map(Object.entries(liveWitnessData.objects))
        : null,
    [liveWitnessData.objects]
  );
  const mergedAllWitnesses = useMemo(() => {
    if (!liveWitnessMap || !liveWitnessMap.size) return allWitnesses;
    return allWitnesses.map((w) => {
      const live = liveWitnessMap.get(w.id);
      return live ? { ...w, ...live } : w;
    });
  }, [allWitnesses, liveWitnessMap]);
  // keep dynamic global parameters fresh from the live 2.1.0 push
  useEffect(() => {
    if (liveWitnessData.objects && liveWitnessData.objects["2.1.0"]) {
      setDynamicGlobalParameters(liveWitnessData.objects["2.1.0"]);
    }
  }, [liveWitnessData.objects]);

  const processedWitnesses = useMemo(() => {
    const blockInterval = globalParameters?.block_interval ?? 3; // Default to 3s if not loaded
    const currentAslot = dynamicGlobalParameters?.current_aslot ?? 0;

    return mergedAllWitnesses
      .map((w) => {
        const account = witnessAccounts[w.witness_account];
        if (!account) return null; // Skip if account data not yet fetched

        // Calculate time since last block (handle potential errors)
        let lastAslotTime = null;
        try {
          if (currentAslot && w.last_aslot) {
            const timeDiffSeconds =
              (currentAslot - w.last_aslot) * blockInterval;
            if (timeDiffSeconds >= 0) {
              // Ensure time diff isn't negative
              lastAslotTime = new Date(Date.now() - timeDiffSeconds * 1000);
            }
          }
        } catch (e) {
          console.error(
            "Error calculating last block time for witness",
            w.id,
            e
          );
        }

        return {
          id: w.id,
          account_id: w.witness_account,
          name: account.name,
          total_votes: parseInt(w.total_votes, 10),
          last_block_num: w.last_confirmed_block_num,
          last_aslot_time: lastAslotTime, // Store as Date object or null
          total_missed: w.total_missed,
          active: activeWitnessIds.includes(w.id),
          signingKey: w.signing_key,
        };
      })
      .filter(Boolean) // Remove null entries
      .filter((witness) =>
        witness.name.toLowerCase().includes(filter.toLowerCase())
      ); // Apply filter
  }, [
    mergedAllWitnesses,
    witnessAccounts,
    activeWitnessIds,
    filter,
    globalParameters,
    dynamicGlobalParameters,
  ]);

  const sortedWitnesses = useMemo(() => {
    const sorted = [...processedWitnesses].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "votes") return a.total_votes - b.total_votes;
      if (sortKey === "rank") return b.total_votes - a.total_votes;
      if (sortKey === "missed") return a.total_missed - b.total_missed;
      return 0;
    });
    if (sortDirection === "desc") {
      sorted.reverse();
    }
    return sorted;
  }, [processedWitnesses, sortKey, sortDirection]);

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

  const voteIdToWitnessMap = useMemo(
    () => new Map(allWitnesses.map((w) => [w.vote_id, w])),
    [allWitnesses]
  );

  const witnessRowProps = useMemo(
    () => ({
      sortedWitnesses,
      witnessAccounts,
      voteIdToWitnessMap,
      t,
      _chain,
    }),
    [sortedWitnesses, witnessAccounts, voteIdToWitnessMap, t, _chain]
  );

  return (
    <div className="container mx-auto mt-5 mb-5">
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-1)/0.2)] blur-3xl" />
        <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] via-[hsl(var(--accent-2)/0.7)] to-[hsl(var(--accent-1)/0.7)]" />
        <CardHeader className="pb-0">
          <CardTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
              <Eye className="h-4.5 w-4.5" />
            </span>
            {t("Witnesses:title")}
          </CardTitle>
          <CardDescription>{t("Witnesses:description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <Input
            placeholder={t("Witnesses:filterPlaceholder")}
            onChange={(e) => debouncedFilterChange(e.target.value)}
            className="mb-4 w-full md:w-1/3 border-[hsl(var(--accent-1)/0.2)] bg-card/60 focus-visible:ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
          />
          {!sortedWitnesses ||
          !sortedWitnesses.length ||
          !witnessCoreBalances ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="w-full">
              <div className="grid grid-cols-12 gap-2 p-2 bg-gradient-to-r from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-2)/0.1)] rounded-t-md font-semibold text-sm sticky top-0 z-10">
                <div
                  className="col-span-4 md:col-span-3 cursor-pointer bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent"
                  onClick={() => handleSort("name")}
                >
                  {t("Witnesses:name")}{" "}
                  {sortKey === "name"
                    ? sortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div className="col-span-4 md:col-span-3">
                  {t("Witnesses:ids")}
                </div>
                <div className="hidden md:block col-span-2">
                  {t("Witnesses:lastBlock")}
                </div>
                <div
                  className="hidden md:block col-span-1 text-center cursor-pointer bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent"
                  onClick={() => handleSort("missed")}
                >
                  {t("Witnesses:missed")}{" "}
                  {sortKey === "missed"
                    ? sortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
                <div
                  className="col-span-4 md:col-span-3 text-right pr-3 cursor-pointer bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent"
                  onClick={() => handleSort("votes")}
                >
                  {t("Witnesses:votes")}{" "}
                  {sortKey === "votes"
                    ? sortDirection === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </div>
              </div>
              <div className="w-full h-[500px]">
                <List
                  rowComponent={WitnessRow}
                  rowCount={sortedWitnesses.length}
                  rowHeight={75}
                  rowProps={witnessRowProps}
                  height={500}
                  width="100%"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DexLiveFooterCard
        lastFetchAt={liveWitnessData.lastFetchAt}
        isSubscribed={liveWitnessData.isSubscribed}
        blockNumber={liveWitnessData.blockNumber}
        nodeUrl={currentNode ? currentNode.url : null}
        warningThresholdSec={10}
      
        chain={_chain}/>
    </div>
  );
}
