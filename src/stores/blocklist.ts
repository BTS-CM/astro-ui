import { persistentMap } from "@nanostores/persistent";

type StoredBlocklist = {
    users: string[];
    timestamp: number;
};

const $blockList = persistentMap<StoredBlocklist>(
    "blocklist",
    {
        users: [],
        timestamp: Date.now(),
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

function updateBlockList(users: string[]) {
    $blockList.set({
        users,
        timestamp: Date.now(),
    });
}

export { $blockList, updateBlockList };