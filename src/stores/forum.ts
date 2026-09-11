import { persistentMap } from "@nanostores/persistent";

export type HiddenForumTopic = {
  channel: string;
  key: string;
  account: string;
  title: string;
  at: number;
};

export type ViewedForumTopic = {
  channel: string;
  key: string;
  topicId: string;
  lastReplyId: string | null;
  at: number;
};

export type WatchedForumTopic = {
  channel: string;
  key: string;
  account: string;
  title: string;
  at: number;
};

type StoredHiddenForumTopics = {
  bitshares: HiddenForumTopic[];
  bitshares_testnet: HiddenForumTopic[];
};

type StoredViewedForumTopics = {
  bitshares: ViewedForumTopic[];
  bitshares_testnet: ViewedForumTopic[];
};

type StoredWatchedForumTopics = {
  bitshares: WatchedForumTopic[];
  bitshares_testnet: WatchedForumTopic[];
};

function codec<T>(fallback: T) {
  return {
    encode(value: T) {
      return JSON.stringify(value);
    },
    decode(value: string): T {
      try {
        return JSON.parse(value) as T;
      } catch (e) {
        console.log(e);
        return fallback;
      }
    },
  };
}

const EMPTY_HIDDEN: StoredHiddenForumTopics = {
  bitshares: [],
  bitshares_testnet: [],
};

const EMPTY_VIEWED: StoredViewedForumTopics = {
  bitshares: [],
  bitshares_testnet: [],
};

const EMPTY_WATCHED: StoredWatchedForumTopics = {
  bitshares: [],
  bitshares_testnet: [],
};

const $hiddenForumTopics = persistentMap<StoredHiddenForumTopics>(
  "hiddenForumTopics",
  EMPTY_HIDDEN,
  codec(EMPTY_HIDDEN)
);

const $viewedForumTopics = persistentMap<StoredViewedForumTopics>(
  "viewedForumTopics",
  EMPTY_VIEWED,
  codec(EMPTY_VIEWED)
);

const $watchedForumTopics = persistentMap<StoredWatchedForumTopics>(
  "watchedForumTopics",
  EMPTY_WATCHED,
  codec(EMPTY_WATCHED)
);

/**
 * Drop entries for `channel` whose key is absent from a successful,
 * non-empty fetch. Callers must only invoke this after an error-free,
 * short-page-terminated scan that yielded >= 1 object — never on error
 * or empty results.
 */
function pruneAbsent<
  T extends { channel: string; key: string },
>(entries: T[], channel: string, fetchedKeys: Set<string>): T[] {
  return entries.filter(
    (e) => e.channel !== channel || fetchedKeys.has(e.key)
  );
}

/** Cap retained entries per chain (newest first by `at`). */
function capEntries<T extends { at: number }>(entries: T[], max: number): T[] {
  if (entries.length <= max) {
    return entries;
  }
  return [...entries].sort((a, b) => b.at - a.at).slice(0, max);
}

function entryKey(channel: string, key: string): string {
  return `${channel} ${key}`;
}

// ---- Hidden topics (per-topic hide) ----

function hideForumTopic(chain: string, topic: HiddenForumTopic) {
  const list = $hiddenForumTopics.get()[chain] ?? [];
  if (list.some((t) => entryKey(t.channel, t.key) === entryKey(topic.channel, topic.key) && t.account === topic.account)) {
    return;
  }
  $hiddenForumTopics.set({
    ...$hiddenForumTopics.get(),
    [chain]: [...list, topic],
  });
}

function unhideForumTopic(chain: string, channel: string, key: string) {
  const list = $hiddenForumTopics.get()[chain] ?? [];
  $hiddenForumTopics.set({
    ...$hiddenForumTopics.get(),
    [chain]: list.filter((t) => entryKey(t.channel, t.key) !== entryKey(channel, key)),
  });
}

function unhideAllForumTopics(chain: string) {
  $hiddenForumTopics.set({ ...$hiddenForumTopics.get(), [chain]: [] });
}

function pruneHiddenForumTopics(chain: string, channel: string, fetchedKeys: Set<string>) {
  const list = $hiddenForumTopics.get()[chain] ?? [];
  const pruned = pruneAbsent(list, channel, fetchedKeys);
  if (pruned.length !== list.length) {
    $hiddenForumTopics.set({ ...$hiddenForumTopics.get(), [chain]: pruned });
  }
}

// ---- Viewed topics (recorded only when a thread is actually opened) ----

const MAX_VIEWED_PER_CHAIN = 500;

function markForumTopicViewed(chain: string, viewed: ViewedForumTopic) {
  const list = $viewedForumTopics.get()[chain] ?? [];
  const rest = list.filter(
    (t) => entryKey(t.channel, t.key) !== entryKey(viewed.channel, viewed.key)
  );
  $viewedForumTopics.set({
    ...$viewedForumTopics.get(),
    [chain]: capEntries([...rest, viewed], MAX_VIEWED_PER_CHAIN),
  });
}

function pruneViewedForumTopics(chain: string, channel: string, fetchedKeys: Set<string>) {
  const list = $viewedForumTopics.get()[chain] ?? [];
  const pruned = pruneAbsent(list, channel, fetchedKeys);
  if (pruned.length !== list.length) {
    $viewedForumTopics.set({ ...$viewedForumTopics.get(), [chain]: pruned });
  }
}

// ---- Watched topics (explicit watch + unread cursor) ----

function watchForumTopic(chain: string, topic: WatchedForumTopic) {
  const list = $watchedForumTopics.get()[chain] ?? [];
  if (list.some((t) => entryKey(t.channel, t.key) === entryKey(topic.channel, topic.key))) {
    return;
  }
  $watchedForumTopics.set({
    ...$watchedForumTopics.get(),
    [chain]: [...list, topic],
  });
}

function unwatchForumTopic(chain: string, channel: string, key: string) {
  const list = $watchedForumTopics.get()[chain] ?? [];
  $watchedForumTopics.set({
    ...$watchedForumTopics.get(),
    [chain]: list.filter((t) => entryKey(t.channel, t.key) !== entryKey(channel, key)),
  });
}

function pruneWatchedForumTopics(chain: string, channel: string, fetchedKeys: Set<string>) {
  const list = $watchedForumTopics.get()[chain] ?? [];
  const pruned = pruneAbsent(list, channel, fetchedKeys);
  if (pruned.length !== list.length) {
    $watchedForumTopics.set({ ...$watchedForumTopics.get(), [chain]: pruned });
  }
}

export {
  $hiddenForumTopics,
  $viewedForumTopics,
  $watchedForumTopics,
  MAX_VIEWED_PER_CHAIN,
  pruneAbsent,
  capEntries,
  hideForumTopic,
  unhideForumTopic,
  unhideAllForumTopics,
  pruneHiddenForumTopics,
  markForumTopicViewed,
  pruneViewedForumTopics,
  watchForumTopic,
  unwatchForumTopic,
  pruneWatchedForumTopics,
};
