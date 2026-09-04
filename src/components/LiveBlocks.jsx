import React, {
  useState,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { Bar, BarChart, XAxis, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import {
  Database,
  Hash,
  Crown,
  Gauge,
  Users,
  ListOrdered,
  Coins,
} from "lucide-react";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";
import { opTypes } from "@/lib/opTypes.js";

import { Card, CardContent } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { chains } from "@/config/chains";

import { useRecentBlocksLive } from "@/hooks/useRecentBlocksLive";
import DexLiveFooterCard from "./DexLiveFooterCard.jsx";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import { humanReadableFloat } from "@/lib/common";

const chartConfig = {
  trxQuantity: {
    label: "Transactions",
    color: "hsl(var(--accent-1))",
  },
};

// Maps an operation type id to one of the page's accent roles so each op badge
// gets a stable, themeable colour (mirrors the status/accent var system).
const ROLE_KEYS = ["1", "2", "3", "success", "info", "warning", "danger"];
function opRole(opType) {
  const n = typeof opType === "number" ? opType : parseInt(opType, 10);
  if (isNaN(n)) return "1";
  return ROLE_KEYS[n % ROLE_KEYS.length];
}
function opBadgeClass(role) {
  return cn(
    "cursor-pointer border transition-colors",
    `bg-[hsl(var(--accent-${role})/0.15)]`,
    `border-[hsl(var(--accent-${role})/0.4)]`,
    `text-[hsl(var(--accent-${role}-fg))]`,
    `hover:bg-[hsl(var(--accent-${role})/0.28)]`
  );
}

// BTS block timestamps arrive as `time_point_sec` strings WITHOUT a timezone
// designator (e.g. "2026-07-12T11:00:05"), which are UTC semantically.
// `new Date(...)` would otherwise parse them as LOCAL time, shifting every
// instant by the machine's UTC offset (a block "seconds ago" would read
// "1h ago" in UTC+1). Normalize to UTC, and accept unix-seconds numbers.
function parseBtsTime(ts) {
  if (ts instanceof Date) return ts;
  if (typeof ts === "number") return new Date(ts * 1000);
  if (
    typeof ts === "string" &&
    !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(ts.trim())
  ) {
    return new Date(ts + "Z");
  }
  return new Date(ts);
}

const RecentBlocksBarChart = ({ data }) => {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-full w-full mt-auto">
        <BarChart
          data={[...data].reverse()}
          margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
      >
        <defs>
          <linearGradient id="blockBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--accent-1))"
              stopOpacity={0.95}
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--accent-2))"
              stopOpacity={0.5}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="block"
          tickLine={false}
          tickMargin={6}
          axisLine={false}
          tick={false}
        />
        <ChartTooltip
          className="bg-card border border-border"
          content={<ChartTooltipContent />}
        />
        <Bar
          dataKey="trxQuantity"
          fill="url(#blockBarGradient)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
};

// A single metric tile rendered in the accent palette.
const BlockStatTile = ({
  icon: Icon,
  accent,
  label,
  value,
  infoHeader,
  infoContent,
}) => (
  <Card
    className={cn(
      "relative overflow-hidden",
      `border-[hsl(var(--accent-${accent})/0.25)]`,
      `bg-gradient-to-br from-[hsl(var(--accent-${accent})/0.07)] to-[hsl(var(--accent-${accent})/0.02)]`
    )}
  >
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-px",
        `bg-gradient-to-r from-transparent via-[hsl(var(--accent-${accent})/0.6)] to-transparent`
      )}
    />
    <CardContent className="pt-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg border",
            `bg-[hsl(var(--accent-${accent})/0.2)]`,
            `border-[hsl(var(--accent-${accent})/0.4)]`
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              `text-[hsl(var(--accent-${accent}-fg))]`
            )}
          />
        </span>
        <HoverInfo header={infoHeader} content={infoContent} type={null} />
      </div>
      <div
        className={cn(
          "text-2xl font-extrabold tracking-tight tabular-nums",
          `text-[hsl(var(--accent-${accent}-fg))]`
        )}
      >
        {value}
      </div>
    </CardContent>
  </Card>
);

/*
  Live blocks now stream via a renderer-side WebSocket subscription
  (set_block_applied_callback + initial lookback burst) - works in dev mode
  and in a plain browser, no Electron required.
*/
export default function LiveBlocks(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);
  const currentNode = useStore($currentNode);

  const [viewJSON, setViewJSON] = useState(false);
  const [json, setJSON] = useState();

  const isTestnet = (chains as any)[usr && usr.chain ? usr.chain : "bitshares"]?.testnet;

  // Mainnet: renderer-side subscription via set_block_applied_callback
  // (BlocksLive.ts). Testnet: background.js polling via window.electron
  // (REFERENCE_CODE path, re-introduced for testnet only).
  const liveBlocksMainnet = useRecentBlocksLive({
    chain: usr && usr.chain ? usr.chain : "bitshares",
    enabled: !isTestnet && Boolean(currentNode && currentNode.url),
    specificNode: currentNode ? currentNode.url : null,
    lookback: 30,
  });

  // Testnet poll blocks via Electron background (REFERENCE_CODE/src/background.js)
  const [pollBlocks, setPollBlocks] = useState([]);
  useEffect(() => {
    if (!isTestnet || !currentNode || !currentNode.url) return;
    if (!window.electron || !window.electron.requestBlocks) return;

    window.electron.requestBlocks({
      url: currentNode.url,
      chain: usr && usr.chain ? usr.chain : "bitshares",
    });

    const handleBlockResponse = (data) => {
      setPollBlocks((prev) => {
        if (prev.find((x) => x.block === data.block)) return prev;
        return [...prev, data];
      });
    };

    window.electron.onBlockResponse(handleBlockResponse);

    return () => {
      try { window.electron.stopBlocks(); } catch {}
    };
  }, [currentNode, isTestnet, usr && usr.chain]);

  const recentBlocks = isTestnet ? pollBlocks : (liveBlocksMainnet.recentBlocks ?? []);
  // Keep hook-compatible shape for footer (footer hidden on testnet anyway)
  const liveBlocks = isTestnet
    ? { recentBlocks: pollBlocks, lastFetchAt: null, isSubscribed: false, blockNumber: null, loading: false, error: null }
    : liveBlocksMainnet;

  const activities = useMemo(() => {
    if (!recentBlocks || !recentBlocks.length) return [];
    return recentBlocks
      .sort(
        (a, b) =>
          parseBtsTime(b.timestamp).getTime() -
          parseBtsTime(a.timestamp).getTime()
      )
      .flatMap((block) => {
        if (!block.transactions) return []; // Check if transactions is defined
        return block.transactions.map((transaction) => {
          return { ...transaction, block: block.block };
        });
      });
  }, [recentBlocks]);

  const totalRecentFees = useMemo(() => {
    if (!activities || !activities.length) return 0;
    return activities.reduce((acc, cur) => {
      return (
        acc +
        cur.operations.reduce((acc, cur) => {
          const fee =
            cur[1] && cur[1].hasOwnProperty("fee") ? cur[1].fee.amount : 0;
          return acc + fee;
        }, 0)
      );
    }, 0);
  }, [activities]);

  // Derived statistics over the buffered window of recent blocks.
  const stats = useMemo(() => {
    if (!recentBlocks || !recentBlocks.length) return null;
    const sorted = [...recentBlocks].sort((a, b) => a.block - b.block);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const spanMs =
      parseBtsTime(last.timestamp).getTime() -
      parseBtsTime(first.timestamp).getTime();
    let spanSeconds = spanMs / 1000;
    if (!(spanSeconds > 0)) spanSeconds = (sorted.length - 1) * 3; // 3s block time fallback
    if (!(spanSeconds > 0)) spanSeconds = 3;

    const totalOps = activities.length;
    const tps = totalOps / spanSeconds;
    const txPerBlock = totalOps / sorted.length;
    const uniqueWitnesses = new Set(sorted.map((x) => x.witness)).size;
    const currentBlock = last.block;
    const currentWitness = last.witness;

    return {
      count: sorted.length,
      currentBlock,
      currentWitness,
      tps,
      txPerBlock,
      uniqueWitnesses,
      fees: totalRecentFees,
    };
  }, [recentBlocks, activities, totalRecentFees]);

  // Relative "x seconds ago" label for block timestamps.
  const relativeTime = useMemo(
    () => (iso) => {
      const diff = (Date.now() - parseBtsTime(iso).getTime()) / 1000;
      if (diff < 1) return t("LiveBlocks:time.now");
      if (diff < 60) {
        return t("LiveBlocks:time.secondsAgo", {
          count: Math.floor(diff),
        });
      }
      const minutes = Math.floor(diff / 60);
      if (minutes < 60) {
        return t("LiveBlocks:time.minutesAgo", { count: minutes });
      }
      const hours = Math.floor(minutes / 60);
      return t("LiveBlocks:time.hoursAgo", { count: hours });
    },
    [t]
  );

  const openJSON = (payload) => {
    setViewJSON(true);
    setJSON(payload);
  };

  const ActivityRow = ({ index, style }) => {
    const activity = activities[index];
    if (!activity) return null;
    return (
      <div
        style={style}
        className="grid grid-cols-[1fr_3fr] items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 mb-1 mt-1 transition-colors hover:border-[hsl(var(--accent-1)/0.5)] hover:bg-[hsl(var(--accent-1)/0.04)]"
      >
        <span className="font-mono text-sm font-semibold tabular-nums text-[hsl(var(--accent-1-fg))]">
          #{activity.block}
        </span>
        <div className="flex flex-wrap justify-start gap-1">
          {activity.operations.length > 10 ? (
            <Badge
              variant="outline"
              className={opBadgeClass("1")}
              onClick={() => {
                openJSON({
                  transactionData: activity,
                  blockData: recentBlocks.find(
                    (x) => x.block === activity.block
                  ),
                });
              }}
            >
              {activity.operations.length}{" "}
              {t("LiveBlocks:operationsLabel")}
            </Badge>
          ) : (
            activity.operations.map((x, i) => {
              const opType = x[0];
              const opName = opTypes[opType] ?? `#${opType}`;
              const role = opRole(opType);
              return (
                <Badge
                  key={`${opType}-${i}`}
                  variant="outline"
                  className={opBadgeClass(role)}
                  onClick={() => {
                    const foundBlock = {
                      ...recentBlocks.find((x) => x.block === activity.block),
                    };
                    delete foundBlock.transactions; // duplicate data
                    openJSON({
                      operationData: x,
                      transactionData: activity,
                      blockData: foundBlock,
                    });
                  }}
                >
                  {opName}
                </Badge>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const BlockRow = ({ index, style }) => {
    const block = recentBlocks[index];
    if (!block) return null;
    const _ts = parseBtsTime(block.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return (
      <div
        style={style}
        className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 p-2 md:grid-cols-4 items-center mb-1 mt-1 transition-colors hover:border-[hsl(var(--accent-2)/0.5)] hover:bg-[hsl(var(--accent-2)/0.04)]"
        title={`${_ts} : ${block.witness}`}
      >
        <div className="font-mono text-sm font-semibold tabular-nums text-[hsl(var(--accent-2-fg))]">
          #{block.block}
        </div>
        <div className="hidden md:block text-xs text-muted-foreground">
          {relativeTime(block.timestamp)}
        </div>
        <div className="hidden md:block truncate text-xs">
          <span className="hover:text-[hsl(var(--accent-2-fg))] transition-colors">
            {block.witness}
          </span>
        </div>
        <div className="text-right md:text-left">
          <Badge
            variant="outline"
            className={opBadgeClass("2")}
          >
            {block.transactions ? block.transactions.length : 0}{" "}
            {t("LiveBlocks:txLabel")}
          </Badge>
        </div>
      </div>
    );
  };

  const isLoading = !recentBlocks || recentBlocks.length === 0;

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 max-w-6xl">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.2)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-2)/0.2)] blur-3xl"
          />

          <div className="relative p-5 sm:p-6">
            {/* Page header */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                    <Database className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  {t("LiveBlocks:cardTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("LiveBlocks:cardDescription")}
                </p>
              </div>
            </div>

            {!currentNode ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  {t("LiveBlocks:connecting")}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stat tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <BlockStatTile
                    icon={Hash}
                    accent="1"
                    label={t("LiveBlocks:currentBlock.header")}
                    infoHeader={t("LiveBlocks:currentBlock.header")}
                    infoContent={t("LiveBlocks:currentBlock.content")}
                    value={
                      stats
                        ? parseFloat(stats.currentBlock).toLocaleString("en-US")
                        : 0
                    }
                  />
                  <BlockStatTile
                    icon={Crown}
                    accent="2"
                    label={t("LiveBlocks:currentWitness.header")}
                    infoHeader={t("LiveBlocks:currentWitness.header")}
                    infoContent={t("LiveBlocks:currentWitness.content")}
                    value={
                      stats && stats.currentWitness ? (
                        <span className="text-lg sm:text-2xl truncate block">
                          {stats.currentWitness}
                        </span>
                      ) : (
                        "-"
                      )
                    }
                  />
                  <BlockStatTile
                    icon={Gauge}
                    accent="3"
                    label={t("LiveBlocks:tps.header")}
                    infoHeader={t("LiveBlocks:tps.header")}
                    infoContent={t("LiveBlocks:tps.content", {
                      blockQty: stats ? stats.count : 0,
                    })}
                    value={stats ? stats.tps.toFixed(4) : 0}
                  />
                  <BlockStatTile
                    icon={Users}
                    accent="1"
                    label={t("LiveBlocks:uniqueWitnesses.header")}
                    infoHeader={t("LiveBlocks:uniqueWitnesses.header")}
                    infoContent={t("LiveBlocks:uniqueWitnesses.content")}
                    value={stats ? stats.uniqueWitnesses : 0}
                  />
                  <BlockStatTile
                    icon={ListOrdered}
                    accent="2"
                    label={t("LiveBlocks:txPerBlock.header")}
                    infoHeader={t("LiveBlocks:txPerBlock.header")}
                    infoContent={t("LiveBlocks:txPerBlock.content", {
                      blockQty: stats ? stats.count : 0,
                    })}
                    value={stats ? stats.txPerBlock.toFixed(4) : 0}
                  />
                  <BlockStatTile
                    icon={Coins}
                    accent="3"
                    label={t("LiveBlocks:recentFees.header")}
                    infoHeader={t("LiveBlocks:recentFees.header")}
                    infoContent={t("LiveBlocks:recentFees.content", {
                      blockQty: stats ? stats.count : 0,
                    })}
                    value={
                      stats && stats.fees
                        ? `${humanReadableFloat(stats.fees, 5)} ${usr && usr.chain === "bitshares" ? "BTS" : "TEST"}`
                        : 0
                    }
                  />
                </div>

                {/* Chart + Recent Blocks, side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
                  <Card className="min-h-[280px]">
                    <CardContent className="pt-5 flex flex-col h-full">
                      <HoverInfo
                        content={t("LiveBlocks:chart.content", {
                          blockQty: stats ? stats.count : 0,
                        })}
                        header={t("LiveBlocks:chart.header")}
                        type="header"
                      />
                      {isLoading ? (
                        <div className="mt-3 text-sm text-muted-foreground">
                          {t("LiveBlocks:waiting")}
                        </div>
                      ) : (
                        <RecentBlocksBarChart
                          data={recentBlocks.slice(-100).map((x) => {
                            if (
                              !x ||
                              !x.hasOwnProperty("transactions") ||
                              !x.transactions
                            ) {
                              return { block: x.block, trxQuantity: 0 };
                            }
                            return {
                              block: x.block,
                              trxQuantity: x.transactions.length,
                            };
                          })}
                        />
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <HoverInfo
                        content={t("LiveBlocks:recentBlocks.content")}
                        header={t("LiveBlocks:recentBlocks.header")}
                        type="header"
                      />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <span>{t("LiveBlocks:recentBlocks.blockId")}</span>
                        <span className="hidden md:block">
                          {t("LiveBlocks:recentBlocks.timestamp")}
                        </span>
                        <span className="hidden md:block">
                          {t("LiveBlocks:recentBlocks.witnessId")}
                        </span>
                        <span>{t("LiveBlocks:recentBlocks.transaction")}</span>
                      </div>
                      {isLoading ? (
                        <div className="mt-3 text-sm text-muted-foreground">
                          {t("LiveBlocks:waiting")}
                        </div>
                      ) : (
                        <div className="w-full h-[360px] mt-1">
                          <List
                            rowComponent={BlockRow}
                            rowCount={recentBlocks.length}
                            rowHeight={42}
                            height={360}
                            width="100%"
                            rowProps={{}}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity, full width */}
                <Card className="mt-2">
                  <CardContent className="pt-5">
                    <HoverInfo
                      content={t("LiveBlocks:recentActivity.content")}
                      header={t("LiveBlocks:recentActivity.header")}
                      type="header"
                    />
                    <div className="grid grid-cols-[1fr_3fr] gap-2">
                      <span>
                        {t("LiveBlocks:recentActivity.blocks")}
                      </span>
                      <span>
                        {t("LiveBlocks:recentActivity.operations")}
                      </span>
                    </div>
                    {isLoading ? (
                      <div className="mt-3 text-sm text-muted-foreground">
                        {t("LiveBlocks:waiting")}
                      </div>
                    ) : (
                      <div className="w-full h-[360px] mt-1">
                        <List
                          rowComponent={ActivityRow}
                          rowCount={activities.length}
                          rowHeight={42}
                          height={360}
                          width="100%"
                          rowProps={{}}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {viewJSON && json ? (
          <Dialog
            open={viewJSON}
            onOpenChange={(open) => {
              setViewJSON(open);
            }}
          >
            <DialogContent className="sm:max-w-[500px] bg-card">
              <DialogHeader>
                <DialogTitle>
                  {t("LiveBlocks:dialogContent.json")}
                </DialogTitle>
                <DialogDescription>
                  {t("LiveBlocks:dialogContent.jsonDescription")}
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder={JSON.stringify(json, null, 2)}
                readOnly={true}
                rows={10}
              />
              <Button
                className="w-1/4 mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(json, null, 2));
                }}
              >
                {t("LiveBlocks:dialogContent.copy")}
              </Button>
            </DialogContent>
          </Dialog>
        ) : null}

        <DexLiveFooterCard
          lastFetchAt={liveBlocks.lastFetchAt}
          isSubscribed={liveBlocks.isSubscribed}
          blockNumber={liveBlocks.blockNumber}
          nodeUrl={currentNode ? currentNode.url : null}
          warningThresholdSec={10}
        
        chain={usr?.chain}/>
      </div>
    </>
  );
}
