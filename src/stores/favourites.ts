import { persistentMap } from "@nanostores/persistent";

export type Asset = {
  symbol: string;
  id: string;
  issuer: string;
};

type User = {
  name: string;
  id: string;
};

type MarketPair = string; // e.g. "BTS_CNY"

type StoredAssets = {
  bitshares: Asset[] | [];
  bitshares_testnet: Asset[] | [];
};

type StoredUsers = {
  bitshares: User[] | [];
  bitshares_testnet: User[] | [];
};

type StoredPairs = {
  bitshares: MarketPair[] | [];
  bitshares_testnet: MarketPair[] | [];
};

const $favouriteAssets = persistentMap<StoredAssets>(
  "favouriteAssets",
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

const $favouriteUsers = persistentMap<StoredUsers>(
  "favouriteUsers",
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

const $favouritePairs = persistentMap<StoredPairs>(
  "favouritePairs",
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

function addFavouriteAsset(chain: string, asset: Asset) {
  const assets = $favouriteAssets.get()[chain] ?? [];
  if (assets.find((a) => a.id === asset.id)) {
    return; // already exists
  }
  // Copy the array: mutating in place keeps the same reference, so memoised
  // selectors (and react-window rows) bail out and the star never updates
  // until an unrelated re-render happens.
  $favouriteAssets.set({ ...$favouriteAssets.get(), [chain]: [...assets, asset] });
}

function removeFavouriteAsset(chain: string, asset: Asset) {
  const assets = $favouriteAssets.get()[chain] ?? [];
  if (!assets.some((a) => a.id === asset.id)) {
    return; // not found
  }
  $favouriteAssets.set({
    ...$favouriteAssets.get(),
    [chain]: assets.filter((a) => a.id !== asset.id),
  });
}

function addFavouriteUser(chain: string, user: User) {
  const users = $favouriteUsers.get()[chain] ?? [];
  if (users.find((u) => u.id === user.id)) {
    return; // already exists
  }
  $favouriteUsers.set({ ...$favouriteUsers.get(), [chain]: [...users, user] });
}

function removeFavouriteUser(chain: string, user: User) {
  const users = $favouriteUsers.get()[chain] ?? [];
  if (!users.some((u) => u.id === user.id)) {
    return; // not found
  }
  $favouriteUsers.set({
    ...$favouriteUsers.get(),
    [chain]: users.filter((u) => u.id !== user.id),
  });
}

function addFavouritePair(chain: string, pair: MarketPair) {
  if (!pair || !pair.includes("_")) return;
  const pairs = $favouritePairs.get()[chain] ?? [];
  const normalized = pair.toUpperCase();
  if (pairs.includes(normalized)) return; // already exists
  $favouritePairs.set({ ...$favouritePairs.get(), [chain]: [...pairs, normalized] });
}

function removeFavouritePair(chain: string, pair: MarketPair) {
  const pairs = $favouritePairs.get()[chain] ?? [];
  const normalized = pair.toUpperCase();
  if (!pairs.includes(normalized)) return; // not found
  $favouritePairs.set({
    ...$favouritePairs.get(),
    [chain]: pairs.filter((p) => p !== normalized),
  });
}

export {
  $favouriteAssets,
  $favouriteUsers,
  $favouritePairs,
  addFavouriteAsset,
  addFavouriteUser,
  addFavouritePair,
  removeFavouriteAsset,
  removeFavouriteUser,
  removeFavouritePair,
};
