import { persistentMap } from "@nanostores/persistent";

type AssetHistoryEntry = {
  symbol: string;
  id: string;
  issuer: string;
  lastUsed: number;
};

type StoredAssetHistory = {
  bitshares: AssetHistoryEntry[];
  bitshares_testnet: AssetHistoryEntry[];
};

const MAX_HISTORY = 100;

const $assetHistory = persistentMap<StoredAssetHistory>(
  "assetHistory",
  {
    bitshares: [],
    bitshares_testnet: [],
  },
  {
    encode(value) {
      return JSON.stringify(value);
    },
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.log(e);
        return value;
      }
    },
  }
);

function addAssetHistory(chain: string, entry: AssetHistoryEntry) {
  if (!chain) return;
  const current = $assetHistory.get()[chain] ?? [];
  const existingIndex = current.findIndex((e) => e.id === entry.id);

  if (existingIndex !== -1) {
    current.splice(existingIndex, 1);
  }

  current.push({ ...entry, lastUsed: Date.now() });

  if (current.length > MAX_HISTORY) {
    current.sort((a, b) => a.lastUsed - b.lastUsed);
    while (current.length > MAX_HISTORY) {
      current.shift();
    }
  }

  $assetHistory.set({ ...$assetHistory.get(), [chain]: current });
}

function clearAssetHistory(chain: string) {
  if (!chain) return;
  $assetHistory.set({ ...$assetHistory.get(), [chain]: [] });
}

export { $assetHistory, addAssetHistory, clearAssetHistory };
export type { AssetHistoryEntry };
