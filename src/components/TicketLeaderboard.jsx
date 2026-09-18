import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Trophy, Copy } from "lucide-react";



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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import ExternalLink from "@/components/common/ExternalLink.jsx";

import ChainTypes from "@/bts/chain/ChainTypes.js";
import { humanReadableFloat } from "@/lib/common.js";

import { $currentNodeUrl } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";
import { createTicketsStore } from "@/nanoeffects/Tickets.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { getObjects } from "@/nanoeffects/src/common";
import { DialogTrigger } from "@radix-ui/react-dialog";

export default function TicketLeaderboard() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNodeUrl = useStore($currentNodeUrl);

  const chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );

  useInitCache(chain ?? "bitshares", []);
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
          currentNodeUrl || "",
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
  }, [chain, currentNodeUrl]);

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
        const nodeURL = currentNodeUrl || null;
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
  }, [leaderboard.rows, chain, currentNodeUrl]);

  const LeaderboardRow = useCallback(({ index, style }) => {
    const r = leaderboard.rows[index];
    if (!r) return null;
    const acc = accounts[r.id];
    const name = acc && acc.name ? acc.name : r.id;

    return (
      <div key={r.id} style={style}>
        <Dialog>
          <DialogTrigger asChild>
            <Card className="relative overflow-hidden border-[hsl(var(--accent-1)/0.15)] bg-card/60 backdrop-blur-xl shadow-sm hover:border-[hsl(var(--accent-1)/0.25)] hover:shadow-[color:hsl(var(--accent-1)/0.1)] transition-all duration-300">
              <div className="p-4">
                <div className="grid grid-cols-3">
                  <div className="text-xs lg:text-lg mt-5">{name}</div>

                  <div className="text-xs lg:text-lg mt-5 text-muted-foreground">
                    {r.amount.toLocaleString(locale.get() || undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}{" "}
                    {assetSymbol}
                  </div>

                  <div className="text-xs lg:text-lg mt-5 text-muted-foreground">
                    {r.percent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[720px] bg-card/60 backdrop-blur-xl border-[hsl(var(--accent-1)/0.15)]">
            <div className="flex items-center gap-2 mt-3 text-center">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-bold">
                      {t("TicketsLeaderboard:th.account", "Account")}
                    </TableCell>
                    <TableCell>
                      <span className="hover:underline text-[hsl(var(--accent-2-fg))] dark:text-[hsl(var(--accent-2-fg))] cursor-pointer">
                        {name}
                      </span>
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
                          className="cursor-pointer border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.2)] transition-colors mr-1"
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
  }, [leaderboard.rows, accounts, assetSymbol, t, tickets]);

  return (
    <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4">
      <div className="grid grid-cols-1 gap-3">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl pointer-events-none" />
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] via-[hsl(var(--accent-1)/0.7)] to-[hsl(var(--accent-1)/0.7)]" />
          <CardHeader className="pb-1">
            <CardTitle className="text-lg bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] bg-clip-text text-transparent flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                <Trophy className="h-4.5 w-4.5" />
              </span>
              {t("TicketsLeaderboard:title", "Ticket leaderboard")}
            </CardTitle>
            <CardDescription>{t("TicketsLeaderboard:description", "Combined effective ticket amounts by account.")}</CardDescription>
          </CardHeader>
          <div className="p-4 pt-2">
            <div className="text-sm mb-3">
              {t("TicketsLeaderboard:total", {
                amount: leaderboard.total.toLocaleString(
                  locale.get() || undefined,
                  { minimumFractionDigits: 5, maximumFractionDigits: 5 }
                ),
                asset: assetSymbol,
              })}
            </div>
            <div className="grid grid-cols-3 bg-gradient-to-r from-[hsl(var(--accent-1)/0.1)] to-[hsl(var(--accent-1)/0.1)] rounded-lg px-3 py-2 mb-2">
              <div className="text-sm font-medium">{t("TicketsLeaderboard:th.account", "Account")}</div>
              <div className="text-sm font-medium">{t("TicketsLeaderboard:th.amount", "Effective amount")}</div>
              <div className="text-sm font-medium">{t("TicketsLeaderboard:th.percent", "% of total")}</div>
            </div>
            <div className="w-full h-[320px]">
              <List
                rowComponent={LeaderboardRow}
                rowCount={leaderboard.rows.length}
                rowHeight={75}
                rowProps={{}}
                height={320}
                width="100%"
              />
            </div>
          </div>
        </Card>

        {showTicketDialog && activeTicketId ? (
          <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
            <DialogContent className="sm:max-w-[720px] bg-card/60 backdrop-blur-xl border-[hsl(var(--accent-1)/0.15)]">
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
              <pre className="bg-card p-3 rounded border text-xs overflow-auto max-h-[60vh]">
                {JSON.stringify(
                  activeTicketObj ?? { id: activeTicketId },
                  null,
                  2
                )}
              </pre>
              <div className="flex items-center gap-2 mt-3 justify-end">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-1))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-1))] active:scale-95 transition-all duration-200 cursor-pointer"
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
                <span className="h-8 flex items-center">{activeTicketId}</span>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}
