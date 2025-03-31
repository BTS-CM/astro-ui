import { chains } from "@/config/chains";
import { persistentMap } from "@nanostores/persistent";

type Configuration = {
  pools: string[];
  name: string;
  chain: string;
  id: string; // hash of name
};

type storedTrackers = {
  bitshares: Configuration[];
  bitshares_testnet: Configuration[];
};

const $poolTrackers = persistentMap<storedTrackers>(
  "trackers",
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

function updateTrackers(chain: string, trackers: Configuration[]) {
  if (!(chains as any)[chain]) {
    return; // block invalid chains
  }
  $poolTrackers.set({ ...$poolTrackers.get(), [chain]: trackers });
}

export { $poolTrackers, updateTrackers };
