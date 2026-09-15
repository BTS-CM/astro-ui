import React, { useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Play, ShieldAlert, VolumeX } from "lucide-react";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import Trollbox from "./Trollbox.jsx";
import TrollboxRisks from "./TrollboxRisks.jsx";
import { $trollboxFooter, pairRoomId } from "@/nanoeffects/Trollbox.ts";

/**
 * Lazy footer trollbox for market pages (DEX limit orders, instant trade).
 *
 * Renders an inert placeholder until the user clicks "Start trollbox" —
 * no chain reads, no polling, nothing rendered for unwilling
 * participants. The opt-in persists via $trollboxFooter; "Silence
 * trollbox" unmounts the widget (polling stops) and persists the
 * off-state.
 *
 * When enabled there is no wrapper card: the Trollbox viewing card is
 * the primary card, with the room tabs + silence toggle slotted into
 * its header via headerActions. Tabs share one mount slot (remount
 * on switch, so only the active channel polls).
 *
 * Rooms come from the `rooms` prop (list of { id, channel, label, tab });
 * the default is the asset-pair room plus the global #trading channel:
 *   - Pair: dedicated on-chain room trollbox-dex-<min>-<max>[-<lang>]
 *     derived from the two 1.3.x asset ids (direction-invariant).
 *   - Trading: the global #trading channel.
 * Callers (e.g. the swap page) may pass their own set instead.
 */
export default function TrollboxFooter(properties) {
  const {
    assetAId = null,
    assetBId = null,
    assetASymbol = null,
    assetBSymbol = null,
    _assetsBTS = [],
    _assetsTEST = [],
    _marketSearchBTS = [],
    _marketSearchTEST = [],
    _poolsBTS = [],
    _poolsTEST = [],
    _feeScheduleBTS = [],
    _feeScheduleTEST = [],
    rooms: roomsProp = null,
  } = properties || {};

  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const footerEnabled = useStore($trollboxFooter) === "1";

  const room = useMemo(
    () => pairRoomId(assetAId, assetBId),
    [assetAId, assetBId]
  );
  // NOTE: joined with "·" — i18next escapes "/" to &#x2F; inside
  // interpolated strings, which glitched the title.
  const pairLabel = useMemo(() => {
    if (!assetASymbol || !assetBSymbol) {
      return null;
    }
    return `${assetASymbol} · ${assetBSymbol}`;
  }, [assetASymbol, assetBSymbol]);

  const [tab, setTab] = useState("pair");
  const [showRisks, setShowRisks] = useState(false);
  const defaultRooms = useMemo(
    () => [
      {
        id: "pair",
        channel: room,
        label: pairLabel,
        tab: t("Trollbox:footerTabPair", "Pair"),
      },
      {
        id: "trading",
        channel: "trading",
        label: null,
        tab: t("Trollbox:footerTabTrading", "Trading"),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, pairLabel]
  );
  const rooms = roomsProp ?? defaultRooms;
  const availableRooms = useMemo(
    () => (rooms || []).filter((r) => r && r.channel),
    [rooms]
  );
  // Without a usable channel (e.g. no pair room yet) pin to the first
  // available room instead of a dead tab.
  const activeRoom =
    availableRooms.find((r) => r.id === tab) ?? availableRooms[0] ?? null;
  const activeChannel = activeRoom ? activeRoom.channel : "trading";

  const start = () => {
    try {
      $trollboxFooter.set("1");
    } catch {
      // storage unavailable: widget still mounts for this visit
    }
  };
  const silence = () => {
    try {
      $trollboxFooter.set("0");
    } catch {
      // storage unavailable: widget still unmounts for this visit
    }
  };

  if (!footerEnabled) {
    return (
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
        />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <MessageSquare className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg tracking-tight">
                {t("Trollbox:footerTitle", "Market trollbox")}
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                {t(
                  "Trollbox:footerPlaceholder",
                  "On-chain chat for this market. Nothing loads until you start it."
                )}
              </CardDescription>
            </div>
            <Button
              onClick={start}
              className="shrink-0 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_0_18px_-4px_hsl(var(--accent-1)/0.6)]"
            >
              <Play className="mr-1.5 h-4 w-4" />
              {t("Trollbox:footerStart", "Start trollbox")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const headerActions = (
    <>
      <div
        className="flex items-center gap-1 rounded-lg border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.05)] p-0.5"
        role="tablist"
        aria-label={t("Trollbox:footerTabs", "Trollbox rooms")}
      >
        {rooms.map((r) => (
          <Button
            key={r.id}
            variant={activeRoom && activeRoom.id === r.id ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={!r.channel}
            onClick={() => setTab(r.id)}
          >
            {r.tab}
          </Button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRisks(true)}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
          {t("Trollbox:footerRisksButton", "View trollbox risks")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={silence}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          title={t("Trollbox:footerSilenceHint", "Stop loading the trollbox")}
        >
          <VolumeX className="mr-1.5 h-3.5 w-3.5" />
          {t("Trollbox:footerSilence", "Silence trollbox")}
        </Button>
      </div>
    </>
  );

  return (
    <>
      <Trollbox
        key={`${activeRoom ? activeRoom.id : "none"}-${activeChannel}`}
        initialChannel={activeChannel}
        channelLabel={activeRoom ? activeRoom.label : null}
        headerActions={headerActions}
        embedded
        hideEmbeddedRisksButton
        _assetsBTS={_assetsBTS}
        _assetsTEST={_assetsTEST}
        _marketSearchBTS={_marketSearchBTS}
        _marketSearchTEST={_marketSearchTEST}
        _poolsBTS={_poolsBTS}
        _poolsTEST={_poolsTEST}
        _feeScheduleBTS={_feeScheduleBTS}
        _feeScheduleTEST={_feeScheduleTEST}
      />
      <Dialog open={showRisks} onOpenChange={setShowRisks}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {t("Trollbox:risksTitle", "Trollbox risks")}
            </DialogTitle>
          </DialogHeader>
          <TrollboxRisks page="trollbox" />
        </DialogContent>
      </Dialog>
    </>
  );
}
