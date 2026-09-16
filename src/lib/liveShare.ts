/**
 * Shared live-subscription helpers for true push feeds.
 *
 * Request/response dedupe lives in `@nanostores/query` (shared cache,
 * `dedupeTime`, `revalidateInterval`) — use the nanoquery fetcher stores
 * for that. This module covers what nanoquery can't: fan-out of a single
 * underlying push subscription (WS `subscribe_to_market`,
 * `set_block_applied_callback`, ChainStore listeners) to N concurrent
 * mounts, plus a hidden-tab guard for the manual testnet fallback loops.
 *
 * Longer term these feeds should become `onMount` lazy stores (docs: Lazy
 * Stores) so components read them via `useStore`; the current
 * `subscribeSharedTopic` adapters preserve existing hook APIs.
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
