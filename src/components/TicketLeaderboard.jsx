import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
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

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import ExternalLink from "@/components/common/ExternalLink.jsx";

import ChainTypes from "@/bts/chain/ChainTypes.js";
import { humanReadableFloat } from "@/lib/common.js";

import { $currentNode } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";
import { createTicketsStore } from "@/nanoeffects/Tickets.ts";
import { getObjects } from "@/nanoeffects/src/common";
import { DialogTrigger } from "@radix-ui/react-dialog";

export default function TicketLeaderboard() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );
  const assetSymbol = useMemo(
    () =>
      chain === "bitshares"
        ? "BTS"
        : chain === "bitshares_testnet"
        ? "TEST"
        : "BTS",
    [chain]
  );

  const [tickets, setTickets] = useState([]);
  useEffect(() => {
    // Auto-fetch some pages on mount for a quick snapshot
    async function fetchTickets() {
      if (chain === "bitshares" || chain === "bitshares_testnet") {
        const store = createTicketsStore([
          chain,
          currentNode ? currentNode.url : null,
          0,
        ]);

        store.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setTickets(data);
          }
        });
      }
    }

    fetchTickets();
  }, [chain, currentNode]);

  const leaderboard = useMemo(() => {
    if (!tickets || !tickets.length) return { rows: [], total: 0 };
    // Filter out liquid
    const filtered = tickets.filter(
      (x) =>
        x.target_type !== ChainTypes.ticket_type.liquid &&
        x.current_type !== "liquid"
    );
    const tallies = {};
    let sum = 0;
    for (let i = 0; i < filtered.length; i++) {
      const tk = filtered[i];
      const acct = tk.account;
      let amt = parseInt(tk.amount?.amount ?? 0, 10);
      // apply boost
      switch (tk.target_type ?? tk.current_type) {
        case ChainTypes.ticket_type.lock_180_days:
        case "lock_180_days":
          amt *= 2;
          break;
        case ChainTypes.ticket_type.lock_360_days:
        case "lock_360_days":
          amt *= 4;
          break;
        case ChainTypes.ticket_type.lock_720_days:
        case "lock_720_days":
          amt *= 8;
          break;
        case ChainTypes.ticket_type.lock_forever:
        case "lock_forever":
          amt *= 8;
          break;
        default:
          amt = 0;
      }
      const hr = parseFloat(humanReadableFloat(amt, 5).toFixed(5));
      sum += hr;
      if (!tallies[acct]) tallies[acct] = { amount: 0, tickets: [] };
      tallies[acct].amount += hr;
      tallies[acct].tickets.push(tk.id);
    }
    const rows = Object.entries(tallies).map(([id, v]) => ({
      id,
      amount: v.amount,
      tickets: v.tickets,
      percent: sum ? (v.amount / sum) * 100 : 0,
    }));
    rows.sort((a, b) => b.amount - a.amount);
    return { rows, total: sum };
  }, [tickets]);

  const [accounts, setAccounts] = useState({});
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [activeTicketObj, setActiveTicketObj] = useState(null);
  useEffect(() => {
    async function fetchAccountsWS() {
      if (!leaderboard.rows.length) {
        setAccounts({});
        return;
      }
      try {
        const nodeURL = currentNode ? currentNode.url : null;
        const ids = leaderboard.rows.map((r) => r.id);
        const results = await getObjects(chain, ids, nodeURL);
        const map = {};
        for (const acc of results || []) {
          if (acc && acc.id) map[acc.id] = acc;
        }
        setAccounts(map);
      } catch (e) {
        console.log(e);
      }
    }
    fetchAccountsWS();
  }, [leaderboard.rows, chain, currentNode]);

  const LeaderboardRow = ({ index, style }) => {
    const r = leaderboard.rows[index];
    const acc = accounts[r.id];
    const name = acc && acc.name ? acc.name : r.id;

    return (
      <div key={r.id} style={style}>
        <Dialog>
          <DialogTrigger asChild>
            <Card className="hover:bg-gray-200">
              <CardContent>
                <div className="grid grid-cols-3">
                  <div className="text-xs lg:text-lg mt-5">{name}</div>

                  <div className="text-xs lg:text-lg mt-5">
                    {r.amount.toLocaleString(locale.get() || undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}{" "}
                    {assetSymbol}
                  </div>

                  <div className="text-xs lg:text-lg mt-5">
                    {r.percent.toFixed(2)}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[720px] bg-white">
            <div className="flex items-center gap-2 mt-3 text-center">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-bold">
                      {t("TicketsLeaderboard:th.account", "Account")}
                    </TableCell>
                    <TableCell>
                      <ExternalLink
                        type="text"
                        hyperlink={`https://explorer.bitshares.ws/#/accounts/${name}`}
                        text={name}
                        classnamecontents="hover:underline text-blue-600 cursor-pointer"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold">
                      {t("TicketsLeaderboard:th.amount", "Effective amount")}
                    </TableCell>
                    <TableCell>
                      {r.amount.toLocaleString(locale.get() || undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}{" "}
                      {assetSymbol}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold">
                      {t("TicketsLeaderboard:th.percent", "% of total")}
                    </TableCell>
                    <TableCell>{r.percent.toFixed(2)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold">
                      {t("TicketsLeaderboard:th.tickets", "Tickets")}
                    </TableCell>
                    <TableCell>
                      {r.tickets.map((tid) => (
                        <Badge
                          key={tid}
                          className="cursor-pointer hover:bg-gray-400 mr-1"
                          variant="secondary"
                          onClick={() => {
                            setActiveTicketId(tid);
                            const found =
                              tickets.find((tk) => tk.id === tid) || null;
                            setActiveTicketObj(found);
                            setShowTicketDialog(true);
                          }}
                          title={t(
                            "TicketsLeaderboard:showTicketJSON",
                            "Show ticket JSON"
                          )}
                        >
                          {tid}
                        </Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4">
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>
              {t("TicketsLeaderboard:title", "Ticket leaderboard")}
            </CardTitle>
            <CardDescription>
              {t(
                "TicketsLeaderboard:description",
                "Combined effective ticket amounts by account."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm mb-3">
              {t("TicketsLeaderboard:total", {
                amount: leaderboard.total.toLocaleString(
                  locale.get() || undefined,
                  { minimumFractionDigits: 5, maximumFractionDigits: 5 }
                ),
                asset: assetSymbol,
              })}
            </div>
            <div className="grid grid-cols-3">
              <div>{t("TicketsLeaderboard:th.account", "Account")}</div>
              <div>{t("TicketsLeaderboard:th.amount", "Effective amount")}</div>
              <div>{t("TicketsLeaderboard:th.percent", "% of total")}</div>
            </div>
            <div className="w-full max-h-[320px] overflow-auto">
              <List
                rowComponent={LeaderboardRow}
                rowCount={leaderboard.rows.length}
                rowHeight={75}
                rowProps={{}}
              />
            </div>
          </CardContent>
        </Card>

        {showTicketDialog && activeTicketId ? (
          <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
            <DialogContent className="sm:max-w-[720px] bg-white">
              <DialogHeader>
                <DialogTitle>
                  {t("TicketsLeaderboard:ticketDialog.title", "Ticket details")}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    "TicketsLeaderboard:ticketDialog.description",
                    "JSON representation of this ticket."
                  )}
                </DialogDescription>
              </DialogHeader>
              <pre className="bg-gray-50 p-3 rounded border text-xs overflow-auto max-h-[60vh]">
                {JSON.stringify(
                  activeTicketObj ?? { id: activeTicketId },
                  null,
                  2
                )}
              </pre>
              <div className="flex items-center gap-2 mt-3 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        JSON.stringify(
                          activeTicketObj ?? { id: activeTicketId },
                          null,
                          2
                        )
                      );
                    } catch (e) {
                      console.log(e);
                    }
                  }}
                >
                  {t("Common:buttons.copy", "Copy")}
                </Button>
                <ExternalLink
                  hyperlink={`https://explorer.bitshares.ws/#/objects/${activeTicketId}`}
                  text={t("Common:buttons.open", "Open")}
                  variant="outline"
                  classnamecontents="h-8"
                />
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}
