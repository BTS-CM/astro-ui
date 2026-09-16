/**
 * Referential-stability comparators for polled lists.
 *
 * Problem: pollers decode fresh objects every tick, so a naive `setX(next)`
 * always installs a new array identity — even when nothing changed. Every
 * `React.memo` row, `useMemo` list transform, and `react-window` List then
 * re-renders on every POLL_MS tick (15–30s) for zero visible change.
 *
 * Nanostores-idiomatic usage: assign the boolean comparators as store
 * equality functions (docs: Value Comparison), so notification bail-out
 * happens once per store instead of once per component:
 *
 *   $topics.eq = (a, b) => listEqual(a, b);
 *
 * For local `useState` lists (Forum/Trollbox/threads predate a list store),
 * the `stable*` updater wrappers below apply the same comparison at the
 * `setState` site and return `prev` when identical, so React bails out.
 * Comparisons are O(n) over ids + a shallow field check — far cheaper than
 * re-rendering N rows.
 */

type IdFn<T> = (item: T) => string | number | null | undefined;

function defaultId<T>(item: T): string | number | null | undefined {
  const v = (item as any)?.id ?? (item as any)?.key;
  return typeof v === "string" || typeof v === "number" ? v : undefined;
}

function shallowRowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return a === b;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  // Rows with huge payloads: id-order equality (checked by callers) is the
  // signal; a same-id in-place edit to a giant row renders on the next
  // tick that actually changes something.
  if (keys.size > 40) return true;
  for (const k of keys) {
    // Nested objects compare by reference only; a new object identity with
    // equal content counts as changed (rare and cheap to just re-render).
    if (!Object.is(a[k], b[k])) return false;
  }
  return true;
}

/** Boolean equality for id-ordered lists. Suitable as `store.eq`. */
export function listEqual<T>(a: T[] | null | undefined, b: T[] | null | undefined, idFn: IdFn<T> = defaultId): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < b.length; i++) {
    const x = a[i];
    const y = b[i];
    if (idFn(x) !== undefined || idFn(y) !== undefined) {
      if (idFn(x) !== idFn(y)) return false;
    }
    if (!shallowRowEqual(x, y)) return false;
  }
  return true;
}

/** Boolean equality for flat records. Suitable as `store.eq`. */
export function recordEqual<T extends Record<string, any>>(a: T, b: T): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of bk) {
    if (!(k in a) || !Object.is((a as any)[k], (b as any)[k])) return false;
  }
  return true;
}

/**
 * setState updater form of `listEqual`: returns `prev` when `next` carries
 * the same ids in the same order with shallow-equal rows; else `next`.
 */
export function stableArray<T>(prev: T[] | null | undefined, next: T[], idFn: IdFn<T> = defaultId): T[] {
  if (prev === next) return (prev ?? next) as T[];
  if (!prev || !next) return next;
  if (prev.length === 0 && next.length === 0) return prev as T[];
  return listEqual(prev, next, idFn) ? (prev as T[]) : next;
}

/**
 * Merge a tail fetch into `prev`, returning `prev` untouched when the tail
 * contributes nothing new. Otherwise returns the merged, sorted, capped
 * array (same semantics as the Forum merge it replaces).
 */
export function stableMergeTail<T>(
  prev: T[],
  tail: T[],
  idFn: IdFn<T>,
  sortCmp: (a: T, b: T) => number,
  cap: number
): T[] {
  if (!tail || tail.length === 0) return prev;
  const ids = new Set<string | number>();
  for (const t of prev) {
    const id = idFn(t);
    if (id !== undefined && id !== null) ids.add(id as string | number);
  }
  let added = false;
  const merged = prev.slice();
  for (const t of tail) {
    const id = idFn(t);
    if (id === undefined || id === null || !ids.has(id as string | number)) {
      if (id !== undefined && id !== null) ids.add(id as string | number);
      merged.push(t);
      added = true;
    }
  }
  if (!added) return prev;
  merged.sort(sortCmp);
  return merged.length > cap ? merged.slice(0, cap) : merged;
}

/** setState updater form of `recordEqual`. */
export function stableRecord<T extends Record<string, any>>(prev: T, next: T): T {
  return recordEqual(prev, next) ? prev : next;
}
