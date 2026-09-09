import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  memo,
} from "react";
import { List } from "react-window";
import { Activity } from "lucide-react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { copyToClipboard } from "@/lib/common.js";

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

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import ExternalLink from "./common/ExternalLink.jsx";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { opTypes, operationTypes } from "@/lib/opTypes";
import beautify from "@/lib/beautify.js";
import { extractObjects } from "@/lib/BitShares.js";
import { humanReadableFloat } from "@/lib/common";

import ChainTypes from "@/bts/chain/ChainTypes.js";
import btsAllAssets from "@/data/bitshares/allAssets.json";
import testAllAssets from "@/data/bitshares_testnet/allAssets.json";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createAccountActivityStore } from "@/nanoeffects/AccountActivity.ts";
import {
  createUsernameStore,
  createObjectStore,
} from "@/nanoeffects/Objects.ts";
import DOMPurify from "dompurify";

/**
 * Fetch account names for ids missing from the map with a single batched
 * get_objects call (beetvault-style), merging results into the map.
 */
async function fetchMissingAccountNames(
  missingIds,
  chain,
  nodeUrl,
  accountNameById
) {
  if (!missingIds.length) return;
  try {
    const store = createObjectStore([
      chain || "bitshares",
      JSON.stringify(missingIds),
      nodeUrl || null,
    ]);
    const fetched = await new Promise((resolve) => {
      let done = false;
      const finish = (val) => {
        if (!done) {
          done = true;
          resolve(val);
        }
      };
      try {
        const unsub = store.subscribe((s) => {
          if (s && !s.loading && s.data) {
            finish(s.data);
            if (typeof unsub === "function") unsub();
          } else if (s && !s.loading && s.error) {
            finish(null);
            if (typeof unsub === "function") unsub();
          }
        });
      } catch (e) {
        finish(null);
      }
      setTimeout(() => finish(null), 10000);
    });
    if (Array.isArray(fetched)) {
      for (const a of fetched) {
        if (a && a.id && a.name && !accountNameById.has(a.id)) {
          accountNameById.set(a.id, a.name);
        }
      }
    }
  } catch (e) {
    // Leave unresolved; callers fall back gracefully.
  }
}

/**
 * Beetvault-style beautification: extract the referenced account/asset ids,
 * resolve them against the provided lookup maps, then run beautify().
 * Returns [] when a referenced account is unresolved (beautify would throw
 * reading `.accountName` of undefined) or when beautify produces no rows.
 */
async function beautifyOperation(
  opObject,
  opType,
  accountNameById,
  assetById
) {
  const { accountsToFetch, assetsToFetch } = await extractObjects(opObject);
  const unresolvedAccounts = (accountsToFetch || []).filter(
    (id) => !accountNameById.has(id)
  );
  if (unresolvedAccounts.length) return [];
  const accountResults = (accountsToFetch || []).map((id) => {
    const name = accountNameById.get(id);
    return { id, name, accountName: name };
  });
  const assetResultsForOp = (assetsToFetch || [])
    .map((id) => assetById.get(id))
    .filter(Boolean);
  const relevantOperationType = (operationTypes || []).find(
    (o) => o.id === opType
  );
  const opKeyFallback = Object.entries(ChainTypes.operations).find(
    ([, v]) => v === opType
  )?.[0];
  try {
    const beautified =
      (await beautify(
        accountResults,
        assetResultsForOp,
        opObject,
        [opType, opObject],
        opType,
        relevantOperationType || {
          method: opKeyFallback || `operation_${opType}`,
        }
      )) || {};
    return Array.isArray(beautified) ? beautified : beautified.rows || [];
  } catch (e) {
    console.debug("beautify failed for op type", opType, e);
    return [];
  }
}

const RecentActivityRow = memo(function RecentActivityRow({ index, style, activity, opRowsById, buildingOps, t, usr, currentNodeUrl }) {
  const activityItem = activity[index];
  const expirationDate = new Date(activityItem.block_data.block_time);
  const now = new Date();
  const timeDiff = now - expirationDate;
  const minutes = Math.floor((timeDiff / 1000 / 60) % 60);
  const hours = Math.floor((timeDiff / 1000 / 60 / 60) % 24);
  const days = Math.floor(timeDiff / 1000 / 60 / 60 / 24);
  const timeDiffString = `${days}d ${hours}h ${minutes}m`;

  const rowStyle = { ...style };

  const [opDialogOpen, setOpDialogOpen] = useState(false);

  const opKey = useMemo(() => {
    const entry = Object.entries(ChainTypes.operations).find(
      ([, v]) => v === activityItem.operation_type
    );
    return entry ? entry[0] : "";
  }, [activityItem.operation_type]);

  const opMethod = useMemo(() => {
    const found = (operationTypes || []).find(
      (o) => o.id === activityItem.operation_type
    );
    return found?.method || null;
  }, [activityItem.operation_type]);

  const feeDisplay = useMemo(() => {
    const fee = activityItem?.operation_history?.op_object?.fee;
    if (!fee || typeof fee.amount !== "number" || !fee.asset_id) return "-";

    const allAssets =
      usr?.chain === "bitshares" ? btsAllAssets : testAllAssets;
    const asset = (allAssets || []).find((a) => a?.id === fee.asset_id);

    const precision = asset?.precision ?? 0;
    const symbol = asset?.symbol ?? fee.asset_id;
    const value = humanReadableFloat(fee.amount, precision);
    return `${value} ${symbol}`;
  }, [activityItem, usr]);

  const beautificationMethod = opMethod || opKey;

  const opId = activityItem.account_history.operation_id;
  const bulkRows = opRowsById[opId] || [];

  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutRows, setAboutRows] = useState(null);
  const [aboutLoading, setAboutLoading] = useState(false);

  // react-window recycles row components for different items while scrolling,
  // so reset the per-item About state whenever this row shows another operation.
  useEffect(() => {
    setAboutOpen(false);
    setAboutRows(null);
    setAboutLoading(false);
  }, [opId]);

  // Build the beautified rows on demand when the About dialog is opened,
  // so it works even if the bulk prebuild hasn't resolved this operation.
  // Mirrors the beetvault flow: extract ids, look up details, then beautify.
  useEffect(() => {
    if (!aboutOpen || aboutRows !== null || aboutLoading) return;
    if (bulkRows.length || buildingOps) return;
    let cancelled = false;
    (async () => {
      setAboutLoading(true);
      try {
        const opObject = activityItem.operation_history.op_object;
        const opType = activityItem.operation_type;
        const { accountsToFetch } = await extractObjects(opObject);
        const accountNameById = new Map();
        await fetchMissingAccountNames(
          accountsToFetch || [],
          usr?.chain,
          currentNodeUrl,
          accountNameById
        );
        const catalog =
          usr?.chain === "bitshares" ? btsAllAssets : testAllAssets;
        const assetById = new Map(
          (catalog || []).map((a) => [
            a.id,
            { id: a.id, symbol: a.symbol, precision: a.precision },
          ])
        );
        const rows = await beautifyOperation(
          opObject,
          opType,
          accountNameById,
          assetById
        );
        if (!cancelled) setAboutRows(rows);
      } catch (e) {
        if (!cancelled) setAboutRows([]);
      } finally {
        if (!cancelled) setAboutLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    aboutOpen,
    aboutRows,
    aboutLoading,
    bulkRows,
    buildingOps,
    activityItem,
    usr,
    currentNodeUrl,
  ]);

  const aboutText = useMemo(() => {
    const effectiveRows =
      aboutRows && aboutRows.length ? aboutRows : bulkRows;
    if (aboutLoading || (buildingOps && !effectiveRows.length)) {
      return t("Market:loading");
    }
    if (!effectiveRows.length) {
      // Always show the operation itself, even if beautification
      // produced no rows for this operation type. The dialog title
      // already names the operation type, so no title prefix here.
      return JSON.stringify(
        activityItem.operation_history.op_object,
        null,
        2
      );
    }
    const lines = effectiveRows.map((row) => {
      const template = t(
        `Beautification:${beautificationMethod}.rows.${row.key}`,
        { defaultValue: row.key }
      );
      // Beautification.json uses single-brace {param} placeholders,
      // so interpolate the beautified params manually.
      return String(template).replace(/\{(\w+)\}/g, (match, key) => {
        const value = row.params ? row.params[key] : undefined;
        return value !== undefined && value !== null ? String(value) : match;
      });
    });
    return lines.join("\n");
  }, [
    aboutRows,
    bulkRows,
    aboutLoading,
    buildingOps,
    t,
    activityItem,
    beautificationMethod,
  ]);

  const sanitizeAndDecode = (input) => {
    if (input === null || input === undefined) return "";
    try {
      const str = String(input);
      const sanitized = DOMPurify.sanitize(str, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
      const textarea = document.createElement("textarea");
      textarea.innerHTML = sanitized;
      return textarea.value;
    } catch (e) {
      return String(input);
    }
  };

  return (
    <div style={rowStyle} className="px-2">
      <Card className="hover:bg-accent/50 md:hidden p-3">
        <div className="grid grid-cols-[2fr_1fr] items-start gap-2">
          <div className="truncate font-medium mt-2">
            <Dialog
              open={opDialogOpen}
              onOpenChange={(open) => {
                setOpDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Badge variant="default" className="cursor-pointer">
                  {opMethod
                    ? t(`Activity:${opMethod}.title`)
                    : opTypes[activityItem.operation_type.toString()]}
                </Badge>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px] bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {t("PortfolioTabs:fullOperationContentsTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("Operations:" + opKey)}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1">
                  <div className="col-span-1">
                    <ScrollArea className="h-72 rounded-md border p-3">
                      {buildingOps &&
                      !(
                        opRowsById[
                          activityItem.account_history.operation_id
                        ] || []
                      ).length ? (
                        <div className="flex items-center gap-3">
                          <Spinner />
                          <p>{t("Market:loading")}</p>
                        </div>
                      ) : (
                          opRowsById[
                            activityItem.account_history.operation_id
                          ] || []
                        ).length ? (
                        <div className="space-y-1">
                          {(
                            opRowsById[
                              activityItem.account_history.operation_id
                            ] || []
                          ).map((row, i) => (
                            <div key={i} className="text-sm">
                              {sanitizeAndDecode(
                                t(
                                  `Activity:${beautificationMethod}.rows.${row.key}`,
                                  row.params || {}
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("PortfolioTabs:noRecentActivityFound")}
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="text-sm mt-2 text-right">{timeDiffString}</div>
        </div>
      </Card>

      <Card className="hover:bg-accent/50 hidden md:block lg:hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-start gap-2 p-2 mb-2">
          <div className="truncate font-medium mt-2">
            <Dialog
              open={opDialogOpen}
              onOpenChange={(open) => {
                setOpDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Badge variant="default" className="cursor-pointer">
                  {opMethod
                    ? t(`Activity:${opMethod}.title`)
                    : opTypes[activityItem.operation_type.toString()]}
                </Badge>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px] bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {t("PortfolioTabs:fullOperationContentsTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("Operations:" + opKey)}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1">
                  <div className="col-span-1">
                    <ScrollArea className="h-72 rounded-md border p-3">
                      {buildingOps &&
                      !(
                        opRowsById[
                          activityItem.account_history.operation_id
                        ] || []
                      ).length ? (
                        <div className="flex items-center gap-3">
                          <Spinner />
                          <p>{t("Market:loading")}</p>
                        </div>
                      ) : (
                          opRowsById[
                            activityItem.account_history.operation_id
                          ] || []
                        ).length ? (
                        <div className="space-y-1">
                          {(
                            opRowsById[
                              activityItem.account_history.operation_id
                            ] || []
                          ).map((row, i) => (
                            <div key={i} className="text-sm">
                              {sanitizeAndDecode(
                                t(
                                  `Activity:${beautificationMethod}.rows.${row.key}`,
                                  row.params || {}
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("PortfolioTabs:noRecentActivityFound")}
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="font-mono text-xs truncate mt-2">
            <span className="text-foreground">
              {activityItem.account_history.operation_id}
            </span>
          </div>

          <div className="font-mono text-xs truncate mt-2">
            <span className="text-foreground">
              {activityItem.block_data.block_num}
            </span>
          </div>

          <div className="text-sm mt-2">{timeDiffString}</div>

          <div className="text-sm mt-2">{feeDisplay}</div>
        </div>
      </Card>

      <Card className="hover:bg-accent/50 hidden lg:block">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] items-start gap-2 p-2 mb-2">
          <div className="truncate font-medium mt-2">
            <Dialog
              open={opDialogOpen}
              onOpenChange={(open) => {
                setOpDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Badge variant="default" className="cursor-pointer">
                  {opMethod
                    ? t(`Activity:${opMethod}.title`)
                    : opTypes[activityItem.operation_type.toString()]}
                </Badge>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px] bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {t("PortfolioTabs:fullOperationContentsTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("Operations:" + opKey)}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1">
                  <div className="col-span-1">
                    <ScrollArea className="h-72 rounded-md border p-3">
                      {buildingOps &&
                      !(
                        opRowsById[
                          activityItem.account_history.operation_id
                        ] || []
                      ).length ? (
                        <div className="flex items-center gap-3">
                          <Spinner />
                          <p>{t("Market:loading")}</p>
                        </div>
                      ) : (
                          opRowsById[
                            activityItem.account_history.operation_id
                          ] || []
                        ).length ? (
                        <div className="space-y-1">
                          {(
                            opRowsById[
                              activityItem.account_history.operation_id
                            ] || []
                          ).map((row, i) => (
                            <div key={i} className="text-sm">
                              {sanitizeAndDecode(
                                t(
                                  `Activity:${beautificationMethod}.rows.${row.key}`,
                                  row.params || {}
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("PortfolioTabs:noRecentActivityFound")}
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="font-mono text-xs truncate mt-2">
            <span className="text-foreground">
              {activityItem.account_history.operation_id}
            </span>
          </div>

          <div className="font-mono text-xs truncate mt-2">
            <span className="text-foreground">
              {activityItem.block_data.block_num}
            </span>
          </div>

          <div className="text-sm mt-2">{timeDiffString}</div>

          <div className="text-sm mt-2">{feeDisplay}</div>

          <div className="flex items-center gap-2 justify-end">
            <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  {t("PortfolioTabs:aboutButton")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px] bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {t(`Beautification:${beautificationMethod}.title`, {
                      defaultValue: t("PortfolioTabs:aboutButton"),
                    })}
                  </DialogTitle>
                  <DialogDescription>
                    {t("Operations:" + opKey)}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1">
                  <div className="col-span-1">
                    <Textarea
                      readOnly
                      className="h-72"
                      value={aboutText}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  {t("PortfolioTabs:viewOperationButton")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px] bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {t("PortfolioTabs:operationJsonTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("PortfolioTabs:operationJsonDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1">
                  <div className="col-span-1">
                    <ScrollArea className="h-72 rounded-md border">
                      <pre>
                        {JSON.stringify(
                          activityItem.operation_history.op_object,
                          null,
                          2
                        )}
                      </pre>
                    </ScrollArea>

                    <Button
                      onClick={() => {
                        copyToClipboard(
                          JSON.stringify(
                            activityItem.operation_history.op_object,
                            null,
                            4
                          )
                        );
                      }}
                      className="mt-2"
                    >
                      {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  {t("PortfolioTabs:viewAllButton")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px] bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {t("PortfolioTabs:fullOperationContentsTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("PortfolioTabs:fullOperationContentsDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1">
                  <div className="col-span-1">
                    <ScrollArea className="h-72 rounded-md border">
                      <pre>{JSON.stringify(activityItem, null, 2)}</pre>
                    </ScrollArea>
                    <Button
                      onClick={() => {
                        copyToClipboard(
                          JSON.stringify(activityItem, null, 4)
                        );
                      }}
                      className="mt-2"
                    >
                      {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default function PortfolioRecentActivity() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );
  const isTestnet = useMemo(
    () => Boolean(usr && usr.chain && usr.chain !== "bitshares"),
    [usr]
  );
  useInitCache(_chain ?? "bitshares", []);

  const [activityCounter, setActivityCounter] = useState(0);
  const [activity, setActivity] = useState();
  const [activityLoading, setActivityLoading] = useState(false);

  const [buildingOps, setBuildingOps] = useState(false);
  const [opRowsById, setOpRowsById] = useState({});
  useEffect(() => {
    async function fetchUserHistory() {
      if (usr && usr.id) {
        const userHistoryStore = createAccountActivityStore([usr.id]);
        userHistoryStore.subscribe(({ data, error, loading }) => {
          setActivityLoading(Boolean(loading));
          if (data && !error && !loading) {
            // Reshape the ES-based activity payload into the legacy shape the
            // rendering code expects.
            const reshaped = (data || []).map((a) => ({
              operation_history: {
                op_object: a.op?.[1] ?? {},
                is_virtual: a.is_virtual,
              },
              operation_type: a.op?.[0] ?? 0,
              account_history: {
                operation_id: `1.11.${a.operation_id_num}`,
              },
              block_data: {
                block_num: a.block_num,
                block_time: a.timestamp,
              },
            }));
            setActivity(reshaped);
            setOpRowsById({});
          }
          if (!data && !loading && error) {
            setActivity([]);
            setOpRowsById({});
          }
        });
      }
    }
    fetchUserHistory();
  }, [usr, activityCounter]);

  const [allAccounts, setAllAccounts] = useState([]);
  const [accountIDs, setAccountIDs] = useState([]);
  const [assetIDs, setAssetIDs] = useState([]);
  const [assetResults, setAssetResults] = useState([]);
  // Prefetch all account names (and prep asset catalog) once activity is loaded
  useEffect(() => {
    async function prefetchAllDetails() {
      if (!activity || !activity.length || !usr || !usr.chain) return;

      try {
        // Gather all account and asset ids across all operations
        const results = await Promise.all(
          activity.map((item) =>
            extractObjects(item.operation_history.op_object)
          )
        );

        const allAccountIds = Array.from(
          new Set(
            results.flatMap((r) => (r.accountsToFetch ? r.accountsToFetch : []))
          )
        );
        setAccountIDs(allAccountIds);

        const allAssetIds = Array.from(
          new Set(
            results.flatMap((r) => (r.assetsToFetch ? r.assetsToFetch : []))
          )
        );
        setAssetIDs(allAssetIds);

        const _assets =
          usr.chain === "bitshares" ? btsAllAssets : testAllAssets;

        const assetResults = allAssetIds.map((id) =>
          _assets.find((a) => a.id === id)
        );
        setAssetResults(assetResults);

        const accStore = createObjectStore([
          usr.chain,
          JSON.stringify(allAccountIds),
          currentNode ? currentNode.url : null,
        ]);

        accStore.subscribe(({ data }) => {
          if (data && !data.error && !data.loading) {
            setAllAccounts(data);
          } else if (data && data.error) {
            console.log("Error prefetching accounts:", data.error);
          }
        });
      } catch (e) {
        console.log(e);
      }
    }

    prefetchAllDetails();
  }, [activity, usr]);

  // Once accounts are prefetched (or none missing), prebuild beautified rows for all ops
  useEffect(() => {
    async function buildAllOperations() {
      if (!activity || !activity.length) return;
      setBuildingOps(true);

      try {
        // Build quick lookup maps from pre-fetched data
        const accountNameById = new Map(
          (allAccounts || []).filter(Boolean).map((a) => [a.id, a.name])
        );
        const assetById = new Map(
          (assetResults || [])
            .filter(Boolean)
            .map((a) => [
              a.id,
              { id: a.id, symbol: a.symbol, precision: a.precision },
            ])
        );

        // Beetvault-style: resolve every referenced account before
        // beautifying, in a single batched get_objects call.
        const wantedAccountIds = new Set();
        for (const item of activity) {
          try {
            const { accountsToFetch } = await extractObjects(
              item.operation_history.op_object
            );
            (accountsToFetch || []).forEach((id) => {
              if (!accountNameById.has(id)) wantedAccountIds.add(id);
            });
          } catch (e) {
            // Ignore; per-item beautification falls back gracefully below.
          }
        }
        await fetchMissingAccountNames(
          [...wantedAccountIds],
          usr?.chain,
          currentNode ? currentNode.url : null,
          accountNameById
        );

        const entries = await Promise.all(
          activity.map(async (item) => {
            const operationObject = item.operation_history.op_object;
            const operationType = item.operation_type;
            const opId = item.account_history.operation_id;

            try {
              const rows = await beautifyOperation(
                operationObject,
                operationType,
                accountNameById,
                assetById
              );
              return [opId, rows];
            } catch (e) {
              console.debug("beautify failed for op", opId, e);
              return [opId, []];
            }
          })
        );

        const map = {};
        for (const [opId, rows] of entries) {
          map[opId] = rows;
        }
        setOpRowsById(map);
      } finally {
        setBuildingOps(false);
      }
    }

    buildAllOperations();
  }, [activity, usr, allAccounts, assetResults, currentNode]);

  const recentActivityRowProps = useMemo(() => ({ activity, opRowsById, buildingOps, t, usr, currentNodeUrl: currentNode ? currentNode.url : null }), [activity, opRowsById, buildingOps, t, usr, currentNode]);

  if (isTestnet) {
    return (
      <div className="container mx-auto mt-5 mb-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Activity className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("PortfolioTabs:recentBlockchainActivityTitle")}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">
              {t("Home:testnetUnsupported")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Activity className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("PortfolioTabs:recentBlockchainActivityTitle")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("PortfolioTabs:recentBlockchainActivityDescription")}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--accent-1)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-2 sm:p-3 overflow-hidden">
            {activityLoading ? (
              <div className="flex items-center gap-3">
                <Spinner />
                <p>{t("Market:loading")}</p>
              </div>
            ) : activity && activity.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={6} className="p-0">
                      <div className="px-2">
                        <div className="hidden md:grid lg:hidden grid-cols-[1fr_1fr_1fr_1fr_1fr] items-start gap-2 p-2">
                          <div className="text-left">
                            {t("PortfolioTabs:th.description", "Description")}
                          </div>
                          <div className="text-left">
                            {t("PortfolioTabs:operationId", "Operation ID")}
                          </div>
                          <div className="text-left">
                            {t("PortfolioTabs:blockNumber", "Block Number")}
                          </div>
                          <div className="text-left">
                            {t("PortfolioTabs:timeSinceBroadcast")}
                          </div>
                          <div className="text-left">
                            {t("PoolTracker:fees")}
                          </div>
                        </div>
                        <div className="hidden lg:grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] items-start gap-2 p-2">
                          <div className="text-left">
                            {t("PortfolioTabs:th.description", "Description")}
                          </div>
                          <div className="text-left">
                            {t("PortfolioTabs:operationId", "Operation ID")}
                          </div>
                          <div className="text-left">
                            {t("PortfolioTabs:blockNumber", "Block Number")}
                          </div>
                          <div className="text-left">
                            {t("PortfolioTabs:timeSinceBroadcast")}
                          </div>
                          <div className="text-left">
                            {t("PoolTracker:fees")}
                          </div>
                          <div className="text-right">
                            {t("PortfolioTabs:actions", "Actions")}
                          </div>
                        </div>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div className="w-full h-[500px]">
                        <List
                          rowComponent={RecentActivityRow}
                          rowCount={activity.length}
                          rowHeight={84}
                          height={500}
                          width="100%"
                          rowProps={recentActivityRowProps}
                        />
                      </div>
                    </td>
                  </tr>
                </TableBody>
              </Table>
            ) : (
              <p>{t("PortfolioTabs:noRecentActivityFound")}</p>
            )}
            </div>

            <div className="mt-4">
              <Button
                onClick={() => {
                  setActivity();
                  setActivityCounter(activityCounter + 1);
                }}
                disabled={activityLoading}
                aria-busy={activityLoading}
                className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)] hover:shadow-[0_12px_36px_-12px_hsl(var(--accent-1)/0.9)] transition-all"
              >
                {t("PortfolioTabs:refreshRecentActivityButton")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
