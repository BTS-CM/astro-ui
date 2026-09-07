import { persistentAtom } from "@nanostores/persistent";

export const HOME_SECTION_ORDER_KEY = "bts-ui-home-section-order";

export const DEFAULT_SECTION_ORDER = [
  "exchanging",
  "transfer",
  "debt",
  "assetCreation",
  "account",
  "invoicing",
  "governance",
  "blockchain",
  "settings",
];

function isValidOrder(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((id) => typeof id === "string")
  );
}

/**
 * Remove unknown ids, drop duplicates, and append any missing default
 * sections at the end (forward-compat when a new section is added).
 */
export function sanitizeSectionOrder(order: unknown): string[] {
  if (!isValidOrder(order)) return [...DEFAULT_SECTION_ORDER];
  const seen = new Set<string>();
  const clean = order.filter(
    (id) => DEFAULT_SECTION_ORDER.includes(id) && !seen.has(id) && (seen.add(id), true)
  );
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!seen.has(id)) {
      clean.push(id);
      seen.add(id);
    }
  }
  return clean;
}

/** Move the entry at `from` to `to` (pure helper, tested via drag end). */
export function moveSectionOrder(order: string[], from: number, to: number): string[] {
  if (from === to) return order;
  if (from < 0 || to < 0 || from >= order.length || to >= order.length) return order;
  const next = [...order];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

export const $homeSectionOrder = persistentAtom<string[]>(
  HOME_SECTION_ORDER_KEY,
  [...DEFAULT_SECTION_ORDER],
  {
    encode: JSON.stringify,
    decode: (str) => {
      try {
        return sanitizeSectionOrder(JSON.parse(str));
      } catch {
        return [...DEFAULT_SECTION_ORDER];
      }
    },
  }
);

export function setSectionOrder(order: string[]) {
  $homeSectionOrder.set(sanitizeSectionOrder(order));
}
