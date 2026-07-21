import React, { useEffect, useState, useRef } from "react";
import { useStore } from "@nanostores/react";
import { $userStorage } from "@/stores/users.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode, setCurrentNode } from "@/stores/node.ts";
import { chains } from "@/config/chains";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const DEFAULT_PORT = 35899;

export default function McpServerControl() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const userStorage = useStore($userStorage);
  const currentUser = useStore($currentUser);

  const [port, setPort] = useState(DEFAULT_PORT);
  const [status, setStatus] = useState({ running: false, url: null });
  const [logs, setLogs] = useState([]);
  const [starting, setStarting] = useState(false);
  const [activeNodeInfo, setActiveNodeInfo] = useState(null);
  const startedRef = useRef(false);
  const currentNode = useStore($currentNode);

  useEffect(() => {
    const onStatus = (s) => setStatus({ running: !!s.running, url: s.url || null });
    const onLog = (msg) => setLogs((l) => [...l.slice(-200), String(msg)]);
    const onActiveNode = (info) => {
      setActiveNodeInfo(info);
      setCurrentNode(info.chain, info.url || undefined);
    };

    if (window.electron && window.electron.mcp) {
      window.electron.mcp.onStatus(onStatus);
      window.electron.mcp.onLog(onLog);
      if (window.electron.mcp.onActiveNode) window.electron.mcp.onActiveNode(onActiveNode);
    }

    // Page-tied lifecycle: start when the page mounts, stop when it unmounts.
    let cancelled = false;
    async function boot() {
      if (startedRef.current) return;
      startedRef.current = true;
      setStarting(true);
      try {
        if (window.electron && window.electron.mcp) {
          if (userStorage && userStorage.users) {
            await window.electron.mcp.setStoredUsers(userStorage.users);
          }
          const res = await window.electron.mcp.start(port);
          if (!cancelled && res && res.ok) {
            setStatus({ running: true, url: res.url });
          }
        }
      } catch (e) {
        console.log({ mcpStartError: e });
      } finally {
        setStarting(false);
      }
    }
    boot();

    return () => {
      cancelled = true;
      if (window.electron && window.electron.mcp) {
        window.electron.mcp.stop();
      }
      startedRef.current = false;
    };
  }, []);

  const copyUrl = () => {
    if (status.url) navigator.clipboard && navigator.clipboard.writeText(status.url);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Model Context Protocol server</h3>
          <Badge variant={status.running ? "default" : "secondary"}>
            {status.running ? "Running (localhost only)" : "Stopped"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Exposes astro-ui's pages, data and operations to an MCP client. The server is bound to
          127.0.0.1 and only runs while this page is open. To use it, point an MCP client (e.g.
          Claude Desktop) at the URL below with the Streamable HTTP transport.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Port</Label>
            <Input
              type="number"
              value={port}
              disabled={status.running}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Connection URL</Label>
            <Input readOnly value={status.url || `http://127.0.0.1:${port}/mcp`} className="font-mono text-xs" />
          </div>
          <Button variant="outline" onClick={copyUrl} disabled={!status.url}>
            Copy
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-foreground">Active user context</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          The bot operates as this account. Change it from your MCP client via the
          <code className="mx-1">set_current_user</code> tool. Known accounts from this app:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {currentUser && currentUser.id ? (
            <Badge variant="outline">{currentUser.username || currentUser.id} ({currentUser.chain})</Badge>
          ) : (
            <Badge variant="outline">none set</Badge>
          )}
          {(userStorage && userStorage.users ? userStorage.users : []).map((u) => (
            <Badge key={u.id} variant="secondary" className="text-[10px]">
              {u.username}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-foreground">Active node</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          The bot reads chain data and builds operations against this node by default. Change it from
          your MCP client via <code className="mx-1">set_active_node</code>, or here:
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {(() => {
            const chain = currentUser.chain || "bitshares";
            const nodeList = (chains[chain] && chains[chain].nodeList) || [];
            const activeUrl = (activeNodeInfo && activeNodeInfo.activeNode) || currentNode.url || "";
            const onChangeNode = async (e) => {
              const url = e.target.value;
              if (window.electron && window.electron.mcp && window.electron.mcp.setActiveNode) {
                await window.electron.mcp.setActiveNode(chain, url);
              }
            };
            return (
              <>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {activeUrl || "default"}
                </Badge>
                <select
                  value={activeUrl}
                  onChange={onChangeNode}
                  className="rounded border border-border bg-background px-2 py-1 text-xs"
                >
                  {nodeList.map((n) => (
                    <option key={n.url} value={n.url}>
                      {n.location ? `${n.location} — ${n.url}` : n.url}
                    </option>
                  ))}
                </select>
              </>
            );
          })()}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-0">
        <div className="flex items-center justify-between px-4 py-2">
          <h4 className="text-sm font-semibold text-foreground">Server log</h4>
          {starting ? <span className="text-xs text-muted-foreground">starting…</span> : null}
        </div>
        <Separator />
        <pre className="max-h-72 overflow-auto p-3 text-[11px] leading-relaxed text-muted-foreground">
          {logs.length ? logs.join("\n") : "No log output yet."}
        </pre>
      </div>
    </div>
  );
}
