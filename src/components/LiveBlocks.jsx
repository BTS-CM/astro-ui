import React, { useState, useEffect, useMemo, useSyncExternalStore, act } from "react";
import { useStore } from "@nanostores/react";
import { FixedSizeList as List } from "react-window";
import { Bar, BarChart, XAxis, CartesianGrid } from "recharts";
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
} from "@/components/ui/dialog";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import { humanReadableFloat } from "@/lib/common";

const chartConfig = {
  trxQuantity: {
    label: "Transactions",
    color: "hsl(var(--chart-1))",
  },
};

const RecentBlocksBarChart = ({ data }) => {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] mt-5 w-full">
      <BarChart
        data={data}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        width={600}
        height={300}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="block" tickLine={false} tickMargin={5} axisLine={false} tick={false} />
        <ChartTooltip className="bg-white" content={<ChartTooltipContent />} />
        <Bar
          dataKey="trxQuantity"
          fill="var(--chart-1)"
          radius={2}
          animationDuration={500}
          animationEasing="ease-in-out"
        />
      </BarChart>
    </ChartContainer>
  );
};

/*
  NOTE: This doesn't work in dev mode - must be run via `npm run build:astro | npm run start`
  This is because we need electron built.
*/
export default function LiveBlocks(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);
  const currentNode = useStore($currentNode);

  const [viewJSON, setViewJSON] = useState(false);
  const [json, setJSON] = useState();
  const [openHyperlink, setOpenHyperlink] = useState(false);
  const [hyperlink, setHyperlink] = useState("");

  let [recentBlocks, setRecentBlocks] = useState([]);
  useEffect(() => {
    if (!currentNode || !currentNode.url) return;

    // Request blocks from the current node
    window.electron.requestBlocks({ url: currentNode.url });

    // Event listener for block responses
    const handleBlockResponse = (data) => {
      if (recentBlocks.length && recentBlocks.find((x) => x.block === data.block)) return;
      setRecentBlocks((prevBlocks) => {
        return [...prevBlocks, data];
      });
    };

    window.electron.onBlockResponse(handleBlockResponse);

    // Cleanup function to remove event listeners and reset state
    return () => {
      window.electron.stopBlocks(); // Send stopBlocks message to stop fetching
    };
  }, [currentNode]);

  const activities = useMemo(() => {
    if (!recentBlocks || !recentBlocks.length) return [];
    return recentBlocks
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
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
          const fee = cur[1] && cur[1].hasOwnProperty("fee") ? cur[1].fee.amount : 0;
          return acc + fee;
        }, 0)
      );
    }, 0);
  }, [activities]);

  const currentBlock = useMemo(() => {
    if (!recentBlocks || !recentBlocks.length) return 0;
    return recentBlocks[0];
  }, [recentBlocks]);

  const ActivityRow = ({ index, style }) => {
    const activity = activities[index];
    if (!activity) return null;
    return (
      <div style={style} className="border grid grid-cols-5 gap-2 mb-1 mt-1">
        <div className="col-span-1 ml-2">
          <span
            className="hover:text-purple-500"
            onClick={() => {
              setHyperlink(
                `https://blocksights.info/#/blocks/${activity.block}${
                  usr.chain === "bitshares" ? "" : "?network=testnet"
                }`
              );
              setOpenHyperlink(true);
            }}
          >
            {activity.block}
          </span>
        </div>
        <div className="col-span-4">
          {activity.operations.length && activity.operations.length > 10 ? (
            <Badge
              onClick={() => {
                setViewJSON(true);
                setJSON({
                  transactionData: activity,
                  blockData: recentBlocks.find((x) => x.block === activity.block),
                });
              }}
            >
              {activity.operations.length} operations
            </Badge>
          ) : (
            activity.operations.map((x) => (
              <Badge
                className="ml-1"
                onClick={() => {
                  setViewJSON(true);
                  let foundBlock = { ...recentBlocks.find((x) => x.block === activity.block) };
                  delete foundBlock.transactions; // duplicate data
                  setJSON({
                    operationData: x,
                    transactionData: activity,
                    blockData: foundBlock,
                  });
                }}
              >
                {x[0]}
              </Badge>
            ))
          )}
        </div>
      </div>
    );
  };

  const BlockRow = ({ index, style }) => {
    const block = recentBlocks[index];
    if (!block) return null;
    return (
      <div style={style} className="border p-2 grid grid-cols-4 gap-2">
        <div>
          <span
            className="hover:text-purple-500"
            onClick={() => {
              setHyperlink(
                `https://blocksights.info/#/blocks/${block.block}${
                  usr.chain === "bitshares" ? "" : "?network=testnet"
                }`
              );
              setOpenHyperlink(true);
            }}
          >
            {block.block}
          </span>
        </div>
        <div>
          {new Date(block.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}
        </div>
        <div>
          <span
            className="hover:text-purple-500"
            onClick={() => {
              setHyperlink(
                `https://blocksights.info/#/witness/${block.witness}${
                  usr.chain === "bitshares" ? "" : "?network=testnet"
                }`
              );
              setOpenHyperlink(true);
            }}
          >
            {block.witness}
          </span>
        </div>
        <div>{block.transactions?.length ?? 0}</div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>{t("LiveBlocks:cardTitle")}</CardTitle>
              <CardDescription>{t("LiveBlocks:cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Card>
                    <CardContent className="pt-5">
                      <HoverInfo
                        content={t("LiveBlocks:currentBlock.content")}
                        header={t("LiveBlocks:currentBlock.header")}
                        type="header"
                      />
                      #{currentBlock ? parseFloat(currentBlock.block).toLocaleString("en-US") : 0}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <HoverInfo
                        content={t("LiveBlocks:currentWitness.content")}
                        header={t("LiveBlocks:currentWitness.header")}
                        type="header"
                      />
                      {recentBlocks && recentBlocks.length ? (
                        <span
                          className="hover:text-purple-500"
                          onClick={() => {
                            setHyperlink(
                              `https://blocksights.info/#/witness/${recentBlocks[0].witness}${
                                usr.chain === "bitshares" ? "" : "?network=testnet"
                              }`
                            );
                            setOpenHyperlink(true);
                          }}
                        >
                          {recentBlocks[0].witness}
                        </span>
                      ) : (
                        "..."
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <HoverInfo
                        content={t("LiveBlocks:tps.content", {
                          blockQty: recentBlocks ? recentBlocks.length : 0,
                        })}
                        header={t("LiveBlocks:tps.header")}
                        type="header"
                      />
                      {(activities.length / recentBlocks.length / 3).toFixed(4)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <HoverInfo
                        content={t("LiveBlocks:uniqueWitnesses.content")}
                        header={t("LiveBlocks:uniqueWitnesses.header")}
                        type="header"
                      />
                      {recentBlocks && recentBlocks.length
                        ? new Set(recentBlocks.map((x) => x.witness)).size
                        : 0}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <HoverInfo
                        content={t("LiveBlocks:txPerBlock.content", {
                          blockQty: recentBlocks ? recentBlocks.length : 0,
                        })}
                        header={t("LiveBlocks:txPerBlock.header")}
                        type="header"
                      />
                      {(activities.length / recentBlocks.length).toFixed(4)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <HoverInfo
                        content={t("LiveBlocks:recentFees.content", {
                          blockQty: recentBlocks ? recentBlocks.length : 0,
                        })}
                        header={t("LiveBlocks:recentFees.header")}
                        type="header"
                      />
                      {totalRecentFees ? humanReadableFloat(totalRecentFees, 5) : 0} (
                      {usr.chain === "bitshares" ? "BTS" : "TEST"})
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Card>
                    <CardContent className="pt-5">
                      <HoverInfo
                        content={t("LiveBlocks:chart.content", {
                          blockQty: recentBlocks ? recentBlocks.length : 0,
                        })}
                        header={t("LiveBlocks:chart.header")}
                        type="header"
                      />
                      <RecentBlocksBarChart
                        data={recentBlocks.map((x) => {
                          if (!x || !x.hasOwnProperty("transactions") || !x.transactions) {
                            return { block: x.block, trxQuantity: 0 };
                          }
                          return {
                            block: x.block,
                            trxQuantity: x.transactions.length,
                          };
                        })}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Card>
                  <CardContent className="pt-5">
                    <HoverInfo
                      content={t("LiveBlocks:recentActivity.content")}
                      header={t("LiveBlocks:recentActivity.header")}
                      type="header"
                    />
                    <div className="grid grid-cols-5 gap-2">
                      <span className="col-span-1">Block</span>
                      <span className="col-span-4">Operations</span>
                    </div>
                    <List
                      height={350}
                      itemCount={activities.length}
                      itemSize={42}
                      className="w-full"
                    >
                      {ActivityRow}
                    </List>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <HoverInfo
                      content={t("LiveBlocks:recentBlocks.content")}
                      header={t("LiveBlocks:recentBlocks.header")}
                      type="header"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      <span>Block ID</span>
                      <span>Timestamp</span>
                      <span>Witness ID</span>
                      <span>Transaction</span>
                    </div>
                    <List
                      height={350}
                      itemCount={recentBlocks.length}
                      itemSize={42}
                      className="w-full"
                    >
                      {BlockRow}
                    </List>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          {openHyperlink && hyperlink && hyperlink.length ? (
            <Dialog
              open={open}
              onOpenChange={(open) => {
                setOpenHyperlink(open);
              }}
            >
              <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                  <DialogTitle>{t("ExternalLink:dialogContent.leaveApp")}</DialogTitle>
                  <DialogDescription>
                    {t("ExternalLink:dialogContent.navigateToExternal")}
                  </DialogDescription>
                </DialogHeader>
                <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
                  {t("ExternalLink:dialogContent.proceedToURL")}
                </h3>
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                  {hyperlink}
                </code>
                <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
                  {t("ExternalLink:dialogContent.checkingLeave")}
                </h3>

                <div className="grid grid-cols-1 gap-3">
                  {window.electron ? (
                    <Button
                      color="gray"
                      variant="outline"
                      onClick={() => window.electron.openURL(hyperlink)}
                    >
                      {t("ExternalLink:dialogContent.openLink")}
                    </Button>
                  ) : (
                    <a href={hyperlink} target="_blank">
                      <Button color="gray" variant="outline">
                        {t("ExternalLink:dialogContent.openLink")}
                      </Button>
                    </a>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          {viewJSON && json ? (
            <Dialog
              open={viewJSON}
              onOpenChange={(open) => {
                setViewJSON(open);
              }}
            >
              <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                  <DialogTitle>{t("LiveBlocks:dialogContent.json")}</DialogTitle>
                  <DialogDescription>
                    {t("LiveBlocks:dialogContent.jsonDescription")}
                  </DialogDescription>
                </DialogHeader>
                <Textarea placeholder={JSON.stringify(json, null, 2)} readOnly={true} rows={10} />
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
        </div>
      </div>
    </>
  );
}
