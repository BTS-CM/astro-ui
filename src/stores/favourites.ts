import { persistentMap } from "@nanostores/persistent";

type Asset = {
    symbol: string;
    id: string;
    issuer: string;
}

type User = {
    name: string;
    id: string;
}

type StoredAssets = {
    bitshares: Asset[] | [];
    bitshares_testnet: Asset[] | [];
}

type StoredUsers = {
    bitshares: User[] | [];
    bitshares_testnet: User[] | [];
}

const $favouriteAssets = persistentMap<StoredAssets>(
    "favouriteAssets",
    {
        bitshares: [],
        bitshares_testnet: []
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
        }
    }
);

const $favouriteUsers = persistentMap<StoredUsers>(
    "favouriteUsers",
    {
        bitshares: [],
        bitshares_testnet: []
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
        }
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

export {
    $favouriteAssets,
    $favouriteUsers,
    addFavouriteAsset,
    addFavouriteUser,
    removeFavouriteAsset,
    removeFavouriteUser
};