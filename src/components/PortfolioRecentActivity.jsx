import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createAccountHistoryStore } from "@/nanoeffects/AccountHistory.ts";

import { $currentUser } from "@/stores/users.ts";

import ExternalLink from "./common/ExternalLink.jsx";
import { opTypes } from "@/lib/opTypes";

export default function PortfolioRecentActivity() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const _chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );
  useInitCache(_chain ?? "bitshares", []);

  const [activityCounter, setActivityCounter] = useState(0);
  const [activity, setActivity] = useState();
  const [activityLoading, setActivityLoading] = useState(false);
  useEffect(() => {
    async function fetchUserHistory() {
      if (usr && usr.id) {
        const userHistoryStore = createAccountHistoryStore([usr.chain, usr.id]);
        userHistoryStore.subscribe(({ data, error, loading }) => {
          setActivityLoading(Boolean(loading));
          if (data && !error && !loading) {
            setActivity(data);
          }
          if (!data && !loading && error) {
            setActivity([]);
          }
        });
      }
    }
    fetchUserHistory();
  }, [usr, activityCounter]);

  const RecentActivityRow = ({ index, style }) => {
    const activityItem = activity[index];
    const expirationDate = new Date(activityItem.block_data.block_time);
    const now = new Date();
    const timeDiff = now - expirationDate;
    const minutes = Math.floor((timeDiff / 1000 / 60) % 60);
    const hours = Math.floor((timeDiff / 1000 / 60 / 60) % 24);
    const days = Math.floor(timeDiff / 1000 / 60 / 60 / 24);
    const timeDiffString = `${days}d ${hours}h ${minutes}m`;

    return (
      <div style={{ ...style }}>
        <Card>
          <div className="grid grid-cols-7">
            <div className="col-span-5">
              <CardHeader>
                <CardTitle>
                  {opTypes[activityItem.operation_type.toString()]}
                </CardTitle>
                <CardDescription>
                  {t("PortfolioTabs:operationId")}
                  <ExternalLink
                    classnamecontents="text-blue-500"
                    type="text"
                    text={` ${activityItem.account_history.operation_id}`}
                    hyperlink={`https://explorer.bitshares.ws/#/objects/${
                      activityItem.account_history.operation_id
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                  <br />
                  {t("PortfolioTabs:blockNumber")}
                  <ExternalLink
                    classnamecontents="text-blue-500"
                    type="text"
                    text={` ${activityItem.block_data.block_num}`}
                    hyperlink={`https://explorer.bitshares.ws/#/blocks/${
                      activityItem.block_data.block_num
                    }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
                  />
                  <br />
                  {t("PortfolioTabs:timeSinceBroadcast", {
                    timeDiff: timeDiffString,
                  })}
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-2 mt-7">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    {t("PortfolioTabs:viewOperationButton")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white">
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
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-2">
                    {t("PortfolioTabs:viewAllButton")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white">
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
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 mt-5">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("PortfolioTabs:recentBlockchainActivityTitle")}
            </CardTitle>
            <CardDescription>
              {t("PortfolioTabs:recentBlockchainActivityDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activityLoading ? (
              <div className="flex items-center gap-3">
                <Spinner />
                <p>{t("Market:loading")}</p>
              </div>
            ) : activity && activity.length ? (
              <div className="max-h-[500px] overflow-auto">
                <List
                  rowComponent={RecentActivityRow}
                  rowCount={activity.length}
                  rowHeight={145}
                  rowProps={{}}
                />
              </div>
            ) : (
              <p>{t("PortfolioTabs:noRecentActivityFound")}</p>
            )}
          </CardContent>
          <div className="px-6 pb-6">
            <Button
              onClick={() => {
                setActivity();
                setActivityCounter(activityCounter + 1);
              }}
              disabled={activityLoading}
              aria-busy={activityLoading}
            >
              {t("PortfolioTabs:refreshRecentActivityButton")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
