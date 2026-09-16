/**
 * Shared live-subscription helpers: dedupe concurrent identical feeds.
 *
 * Problem: every hook instance created its own WS subscription / 3.5s
 * testnet poll / 2s guard interval / ChainStore listener. Mounting N hooks
 * for the same market/account/blocks multiplied RPCs and timers by N.
 *
 * This module provides tiny ref-counted primitives with identical call
 * semantics for a single subscriber, but a single underlying feed for N:
 *
 * - subscribeSharedTopic: one underlying start() per key, fan-out to N
 *   onUpdate callbacks, last value replayed to late joiners. Last
 *   unsubscribe tears the feed down.
 * - dedupedCall: coalesce concurrent identical RPCs (+ optional TTL).
 * - shouldSkipBackgroundWork: pause polling when tab hidden.
 */

type Unstop = () => void | Promise<void>;

interface Topic<T> {
  refs: number;
  updates: Set<(data: T) => void>;
  errors: Set<(e: any) => void>;
  latest: { has: boolean; value?: T };
  stop: Unstop | null;
  starting: Promise<void> | null;
  stopped: boolean;
}

const topics = new Map<string, Topic<any>>();

function isBackgrounded(): boolean {
  try {
    return (
      typeof document !== "undefined" &&
      document.visibilityState !== "undefined" &&
      document.visibilityState === "hidden"
    );
  } catch {
    return false;
  }
}

/** Skip polling work when the tab is hidden (feeds resume on visible). */
export function shouldSkipBackgroundWork(): boolean {
  return isBackgrounded();
}

/**
 * Subscribe to a shared topic. `start(emit, fail)` is invoked once for the
 * first subscriber and must return a stop function (sync or async). All
 * subscribers receive every emit; late joiners immediately receive the
 * latest value if one was already emitted.
 */
export function subscribeSharedTopic<T>(
  key: string,
  start: (
    emit: (data: T) => void,
    fail: (e: any) => void
  ) => Unstop | Promise<Unstop>,
  onUpdate: (data: T) => void,
  onError?: (e: any) => void
): () => void | Promise<void> {
  let topic = topics.get(key) as Topic<T> | undefined;
  if (!topic) {
    topic = {
      refs: 0,
      updates: new Set(),
      errors: new Set(),
      latest: { has: false },
      stop: null,
      starting: null,
      stopped: false,
    };
    topics.set(key, topic);
  }
  const t = topic;
  t.refs += 1;
  t.updates.add(onUpdate);
  if (onError) t.errors.add(onError);

  // Replay latest to late joiners so UI paints without waiting a full tick.
  if (t.latest.has) {
    const v = t.latest.value as T;
    try {
      // async so subscribe() stays sync and strict-mode double-mount is safe
      queueMicrotask(() => {
        try {
          onUpdate(v);
        } catch {}
      });
    } catch {
      try {
        onUpdate(v);
      } catch {}
    }
  }

  if (!t.starting && !t.stop && !t.stopped) {
    const emit = (data: T) => {
      t.latest = { has: true, value: data };
      t.updates.forEach((cb) => {
        try {
          cb(data);
        } catch {}
      });
    };
    const fail = (e: any) => {
      t.errors.forEach((cb) => {
        try {
          cb(e);
        } catch {}
      });
    };
    try {
      const maybeStop = start(emit, fail);
      if (maybeStop && typeof (maybeStop as any).then === "function") {
        t.starting = (maybeStop as Promise<Unstop>).then(
          (stop) => {
            t.starting = null;
            if (t.stopped || t.refs <= 0) {
              try {
                const r = stop?.();
                if (r && typeof (r as any).then === "function")
                  (r as Promise<void>).catch(() => {});
              } catch {}
              topics.delete(key);
            } else {
              t.stop = stop ?? null;
            }
          },
          () => {
            t.starting = null;
            fail(new Error(`shared topic start failed: ${key}`));
            if (t.refs <= 0) topics.delete(key);
          }
        );
      } else {
        t.stop = (maybeStop as Unstop) ?? null;
      }
    } catch (e) {
      fail(e);
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    t.refs -= 1;
    t.updates.delete(onUpdate);
    if (onError) t.errors.delete(onError);
    if (t.refs <= 0) {
      t.stopped = true;
      const stop = t.stop;
      t.stop = null;
      topics.delete(key);
      if (stop) {
        try {
          return stop();
        } catch {}
      }
    }
  };
}

// ---- Deduped one-shot RPCs ---------------------------------------------

interface Inflight {
  promise: Promise<any>;
  at: number;
}

const inflight = new Map<string, Inflight>();
const INFLIGHT_TTL_MS = 5000;

function pruneInflight(now: number) {
  if (inflight.size < 50) return;
  for (const [k, v] of inflight) {
    if (now - v.at > INFLIGHT_TTL_MS) inflight.delete(k);
  }
}

/**
 * Coalesce concurrent identical calls. Concurrent callers share one
 * promise; results are replayed for `ttlMs` to absorb debounce pile-ups
 * (e.g. candle refetch on every market tick).
 */
export function dedupedCall<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = 2000
): Promise<T> {
  const now = Date.now();
  pruneInflight(now);
  const hit = inflight.get(key);
  if (hit && now - hit.at < Math.max(ttlMs, 1000)) {
    return hit.promise as Promise<T>;
  }
  const promise = fn().finally(() => {
    // keep for TTL replay, then drop
    setTimeout(() => {
      if (inflight.get(key)?.promise === promise) inflight.delete(key);
    }, Math.max(ttlMs, 1000));
  });
  inflight.set(key, { promise, at: now });
  return promise;
}
