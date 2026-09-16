import { useEffect, useRef } from "react";
import { $connectionStatus, initConnectionStatus } from "@/stores/connection";

/**
 * Shared connection guard for all subscription hooks.
 *
 * Owns (single registration per component):
 *  - $connectionStatus watch -> onConnectionError(status)
 *  - window online/offline   -> onOnline / onOffline
 *  - visibility/pageshow/focus resume checks
 *  - staleness interval: no update for `staleMs` while subscribed
 *    => onStale() + onReconnectNeeded()
 *
 * All callbacks are optional. The guard tracks mount state internally and
 * suppresses callbacks after unmount, so hooks do not need their own
 * cancelled flags for these paths.
 */

export interface SubscriptionGuardOptions {
  lastFetchAtRef: React.MutableRefObject<number | null>;
  isSubscribedRef: React.MutableRefObject<boolean>;
  staleMs?: number;
  onStale?: () => void;
  onOnline?: () => void;
  onOffline?: () => void;
  onConnectionError?: (status: string) => void;
  onReconnectNeeded?: () => void;
}

export function useSubscriptionGuard(options: SubscriptionGuardOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const staleMs = options.staleMs ?? 10000;

  useEffect(() => {
    return ensureSharedGuard(staleMs, optionsRef);
    // staleMs is expected to be a constant per hook; register once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ---- Shared guard backend: 1 interval + 1 listener set per page ---------
// Previously every hook instance registered its own 2s interval, 5 window
// listeners, and $connectionStatus subscription. N hooks => N ticking
// timers all doing the same stale check. Now one ticker fans out to N
// registered guards; per-hook semantics (refs/callbacks) are unchanged.

type GuardEntry = {
  staleMs: number;
  optionsRef: React.MutableRefObject<SubscriptionGuardOptions>;
  mounted: boolean;
};

const guardEntries = new Set<GuardEntry>();
let guardBackendStarted = false;
let guardStaleId: any = null;
let guardUnsub: (() => void) | null = null;

function guardCheckEntry(entry: GuardEntry) {
  if (!entry.mounted) return;
  if (
    typeof document !== "undefined" &&
    document.visibilityState !== "visible"
  ) {
    return;
  }
  const opts = entry.optionsRef.current;
  const last = opts.lastFetchAtRef.current;
  const stale = !last || Date.now() - last > entry.staleMs;
  if (
    (stale || !opts.isSubscribedRef.current) &&
    (typeof navigator === "undefined" || navigator.onLine)
  ) {
    if (opts.onReconnectNeeded) opts.onReconnectNeeded();
  }
}

function guardTickStale() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const now = Date.now();
  for (const entry of guardEntries) {
    if (!entry.mounted) continue;
    const opts = entry.optionsRef.current;
    const last = opts.lastFetchAtRef.current;
    if (!last) continue;
    if (
      now - last > entry.staleMs &&
      opts.isSubscribedRef.current
    ) {
      try {
        if (opts.onStale) opts.onStale();
      } catch {}
      try {
        if (opts.onReconnectNeeded) opts.onReconnectNeeded();
      } catch {}
    }
  }
}

function guardOnOnline() {
  for (const entry of guardEntries) {
    if (!entry.mounted) continue;
    try {
      entry.optionsRef.current.onOnline?.();
    } catch {}
  }
}

function guardOnOffline() {
  for (const entry of guardEntries) {
    if (!entry.mounted) continue;
    try {
      entry.optionsRef.current.onOffline?.();
    } catch {}
  }
}

function guardOnVisibility() {
  if (
    typeof document !== "undefined" &&
    document.visibilityState === "visible"
  ) {
    for (const entry of guardEntries) guardCheckEntry(entry);
  }
}

function guardOnConnectionStatus(v: unknown) {
  if (v !== "closed" && v !== "error") return;
  for (const entry of guardEntries) {
    if (!entry.mounted) continue;
    try {
      entry.optionsRef.current.onConnectionError?.(v as string);
    } catch {}
  }
}

function ensureGuardBackend() {
  if (guardBackendStarted || typeof window === "undefined") return;
  guardBackendStarted = true;

  initConnectionStatus();

  try {
    guardUnsub = $connectionStatus.subscribe((v) => guardOnConnectionStatus(v));
  } catch {}

  window.addEventListener("online", guardOnOnline);
  window.addEventListener("offline", guardOnOffline);
  document.addEventListener("visibilitychange", guardOnVisibility);
  window.addEventListener("pageshow", guardOnVisibility);
  window.addEventListener("focus", guardOnVisibility);

  guardStaleId = setInterval(guardTickStale, 2000);
}

function ensureSharedGuard(
  staleMs: number,
  optionsRef: React.MutableRefObject<SubscriptionGuardOptions>
) {
  ensureGuardBackend();

  const entry: GuardEntry = { staleMs, optionsRef, mounted: true };
  guardEntries.add(entry);

  return () => {
    entry.mounted = false;
    guardEntries.delete(entry);
    // Backend intentionally stays alive for the page lifetime: tearing
    // down/recreating the interval + listeners on every hook unmount
    // costs more than one idle 2s tick. No per-hook cleanup needed
    // beyond dropping the entry.
    void guardUnsub;
    void guardStaleId;
  };
}
