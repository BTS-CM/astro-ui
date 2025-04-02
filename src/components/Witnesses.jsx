import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex as toHex } from "@noble/hashes/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/Avatar.tsx"; // Re-using existing component

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  createObjectStore,
  createEveryObjectStore,
} from "@/nanoeffects/Objects.ts";

import { createUsersCoreBalanceStore } from "@/nanoeffects/UserBalances.js";

import { $blockList } from "@/stores/blocklist.ts";
import { humanReadableFloat, debounce } from "@/lib/common";
import ExternalLink from "./common/ExternalLink.jsx";

const activeTabStyle = {
  backgroundColor: "#252526",
  color: "white",
};

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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState("rank"); // rank, name, votes, missed
  const [sortDirection, setSortDirection] = useState("asc"); // asc, desc

  // 1. Fetch Global and Dynamic Global Parameters
  useEffect(() => {
    let unsubscribeGlobal;
    let unsubscribeDynamic;
    if (usr && usr.chain && currentNode) {
      setLoading(true); // Start loading when fetching begins
      const globalParamsStore = createObjectStore([
        usr.chain,
        JSON.stringify(["2.0.0", "2.1.0"]), // Fetch both objects
        currentNode.url,
      ]);
      unsubscribeGlobal = globalParamsStore.subscribe(
        ({ data, error, loading: gpLoading }) => {
          if (data && !error && !gpLoading && data.length === 2) {
            setGlobalParameters(data[0].parameters);
            setDynamicGlobalParameters(data[1]);
          } else if (error) {
            console.error("Error fetching global parameters:", error);
          }
        }
      );
    }
    // Cleanup function
    return () => {
      if (unsubscribeGlobal) unsubscribeGlobal();
    };
  }, [usr, currentNode]);

  // 2. Fetch All Witness Objects (1.6.x)
  useEffect(() => {
    let unsubscribe;
    if (usr && usr.chain && currentNode && globalParameters) {
      // Ensure globalParameters are loaded first
      const allWitnessStore = createEveryObjectStore([
        usr.chain,
        1, // space_id
        6, // type_id for witness
        0, // start from beginning
        currentNode.url,
      ]);
      unsubscribe = allWitnessStore.subscribe(
        ({ data, error, loading: wLoading }) => {
          if (data && !error && !wLoading) {
            let filteredData = data.filter((x) => x); // Filter out null/undefined entries
            if (_chain === "bitshares") {
              // Apply blocklist filter
              filteredData = filteredData.filter(
                (witness) =>
                  !blocklist.users.includes(
                    toHex(sha256(witness.witness_account))
                  )
              );
            }
            setAllWitnesses(filteredData);
          } else if (error) {
            console.error("Error fetching all witnesses:", error);
          }
        }
      );
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usr, currentNode, globalParameters, blocklist, _chain]); // Added blocklist and _chain dependency

  // 3. Fetch Account Objects (1.2.x) for all witnesses
  useEffect(() => {
    let unsubscribe;
    if (usr && usr.chain && currentNode && allWitnesses.length > 0) {
      const accountIds = allWitnesses.map((w) => w.witness_account);
      const uniqueAccountIds = [...new Set(accountIds)];

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
        }
      );
    } else if (
      allWitnesses.length === 0 &&
      globalParameters &&
      dynamicGlobalParameters
    ) {
      // Stop loading if there are no witnesses to fetch accounts for, but globals are loaded
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [
    usr,
    currentNode,
    allWitnesses,
    globalParameters,
    dynamicGlobalParameters,
  ]); // Depends on allWitnesses & globals

  // Processing and Filtering Logic
  const activeWitnessIds = useMemo(
    () =>
      globalParameters ? new Set(globalParameters.active_witnesses) : new Set(),
    [globalParameters]
  );

  const processedWitnesses = useMemo(() => {
    const blockInterval = globalParameters?.block_interval ?? 3; // Default to 3s if not loaded
    const currentAslot = dynamicGlobalParameters?.current_aslot ?? 0;

    return allWitnesses
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
          active: activeWitnessIds.has(w.id),
        };
      })
      .filter(Boolean) // Remove null entries
      .filter((witness) =>
        witness.name.toLowerCase().includes(filter.toLowerCase())
      ); // Apply filter
  }, [
    allWitnesses,
    witnessAccounts,
    activeWitnessIds,
    filter,
    globalParameters,
    dynamicGlobalParameters,
  ]);

  const sortedWitnesses = useMemo(() => {
    let standby = processedWitnesses;
    standby.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "votes" || sortKey === "rank")
        return b.total_votes - a.total_votes; // Sort standby by votes too
      if (sortKey === "missed") return a.total_missed - b.total_missed;
      return 0;
    });
    if (sortDirection === "desc") {
      standby.reverse();
    }
    return standby;
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

  const WitnessRow = ({ index, style }) => {
    const witness = sortedWitnesses[index];
    if (!witness) return null;

    let missedClass = "text-green-600"; // Default (low missed)
    if (witness.total_missed > 500 && witness.total_missed <= 1250)
      missedClass = "text-blue-600";
    else if (witness.total_missed > 1250 && witness.total_missed <= 2000)
      missedClass = "text-orange-600";
    else if (witness.total_missed > 2000) missedClass = "text-red-600";

    return (
      <div style={style} key={witness.id}>
        <Card className="mb-1 hover:bg-secondary/10">
          <CardContent className="pt-3 pb-3 text-sm">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3 flex items-center">
                <Avatar
                  size={30}
                  name={witness.name}
                  extra={`W${index}`}
                  expression={{ eye: "normal", mouth: "open" }}
                  colors={[
                    "#F0AB3D",
                    "#C271B4",
                    "#C20D90",
                    "#92A1C6",
                    "#146A7C",
                  ]}
                />
                <span className="ml-2">{witness.name}</span>
              </div>
              <div className="col-span-2">
                <ExternalLink
                  classnamecontents="text-blue-500 hover:text-purple-500"
                  type="text"
                  text={witness.id}
                  hyperlink={`https://blocksights.info/#/objects/${witness.id}${
                    _chain === "bitshares" ? "" : "?network=testnet"
                  }`}
                />{" "}
                (
                <ExternalLink
                  classnamecontents="text-blue-500 hover:text-purple-500"
                  type="text"
                  text={witness.account_id}
                  hyperlink={`https://blocksights.info/#/accounts/${
                    witness.account_id
                  }${_chain === "bitshares" ? "" : "?network=testnet"}`}
                />
                )
              </div>
              <div className="col-span-2">
                {witness.last_aslot_time
                  ? formatTimeAgo(witness.last_aslot_time, t)
                  : "N/A"}
                <br />
                <span className="text-xs">
                  (
                  <ExternalLink
                    classnamecontents="text-blue-500 hover:text-purple-500"
                    type="text"
                    text={`#${witness.last_block_num}`}
                    hyperlink={`https://blocksights.info/#/blocks/${
                      witness.last_block_num
                    }${_chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                  )
                </span>
              </div>
              <div
                className={`col-span-1 text-center font-medium ${missedClass}`}
              >
                {witness.total_missed}
              </div>
              <div className="col-span-3 text-right pr-3">
                {humanReadableFloat(witness.total_votes, 5).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 0 }
                )}{" "}
                BTS
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderList = (witnesses) => (
    <div className="w-full">
      <div className="grid grid-cols-12 gap-2 p-2 bg-gray-100 rounded-t-md font-semibold text-sm sticky top-0 z-10">
        <div
          className="col-span-3 cursor-pointer"
          onClick={() => handleSort("name")}
        >
          {t("Witnesses:name")}{" "}
          {sortKey === "name" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
        </div>
        <div className="col-span-2">{t("Witnesses:ids")}</div>
        <div className="col-span-2">{t("Witnesses:lastBlock")}</div>
        <div
          className="col-span-1 text-center cursor-pointer"
          onClick={() => handleSort("missed")}
        >
          {t("Witnesses:missed")}{" "}
          {sortKey === "missed" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
        </div>
        <div className="col-span-1">{t("Witnesses:balance")} (BTS)</div>
        <div
          className="col-span-3 text-right pr-3 cursor-pointer"
          onClick={() => handleSort("votes")}
        >
          {t("Witnesses:votes")}{" "}
          {sortKey === "votes" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
        </div>
      </div>
      <ScrollArea className="h-[500px]">
        <List
          height={500}
          itemCount={sortedWitnesses.length}
          itemSize={65} // Adjust as needed
          width="100%"
        >
          {WitnessRow}
        </List>
      </ScrollArea>
    </div>
  );

  return (
    <div className="container mx-auto mt-5 mb-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("Witnesses:title")}</CardTitle>
          <CardDescription>{t("Witnesses:description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={t("Witnesses:filterPlaceholder")}
            onChange={(e) => debouncedFilterChange(e.target.value)}
            className="mb-4 w-full md:w-1/3"
          />
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            renderList(sortedStandbyWitnesses)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
