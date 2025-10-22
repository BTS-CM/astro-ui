import { persistentMap } from "@nanostores/persistent";

type Asset = {
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
  const assets = $favouriteAssets.get()[chain];
  if (assets.find((a) => a.id === asset.id)) {
    return; // already exists
  }
  assets.push(asset);
  $favouriteAssets.set({ ...$favouriteAssets.get(), [chain]: assets });
}

function removeFavouriteAsset(chain: string, asset: Asset) {
  const assets = $favouriteAssets.get()[chain];
  const index = assets.findIndex((a) => a.id === asset.id);
  if (index === -1) {
    return; // not found
  }
  assets.splice(index, 1);
  $favouriteAssets.set({ ...$favouriteAssets.get(), [chain]: assets });
}

function addFavouriteUser(chain: string, user: User) {
  const users = $favouriteUsers.get()[chain];
  if (users.find((u) => u.id === user.id)) {
    return; // already exists
  }
  users.push(user);
  $favouriteUsers.set({ ...$favouriteUsers.get(), [chain]: users });
}

function removeFavouriteUser(chain: string, user: User) {
  const users = $favouriteUsers.get()[chain];
  const index = users.findIndex((u) => u.id === user.id);
  if (index === -1) {
    return; // not found
  }
  users.splice(index, 1);
  $favouriteUsers.set({ ...$favouriteUsers.get(), [chain]: users });
}

function addFavouritePair(chain: string, pair: MarketPair) {
  if (!pair || !pair.includes("_")) return;
  const pairs = $favouritePairs.get()[chain];
  const normalized = pair.toUpperCase();
  if (pairs.includes(normalized)) return; // already exists
  pairs.push(normalized);
  $favouritePairs.set({ ...$favouritePairs.get(), [chain]: pairs });
}

function removeFavouritePair(chain: string, pair: MarketPair) {
  const pairs = $favouritePairs.get()[chain];
  const normalized = pair.toUpperCase();
  const index = pairs.indexOf(normalized);
  if (index === -1) return; // not found
  pairs.splice(index, 1);
  $favouritePairs.set({ ...$favouritePairs.get(), [chain]: pairs });
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
