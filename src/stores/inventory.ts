import { persistentMap } from "@nanostores/persistent";

export type PriceOption = {
  asset: string;
  price: number;
};

export type InventoryItem = {
  id?: string;
  barcode?: string;
  name: string;
  prices: PriceOption[];
};

type StoredInventory = {
  items: InventoryItem[];
};

const $inventoryStorage = persistentMap<StoredInventory>(
  "storedInventory:",
  {
    items: [],
  },
  {
    encode(value) {
      return JSON.stringify(value);
    },
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error("Failed to decode storedInventory:", e);
        return { items: [] } as StoredInventory;
      }
    },
  }
);

function setItems(items: InventoryItem[]) {
  $inventoryStorage.setKey("items", items);
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function addItem(item: InventoryItem) {
  const items = $inventoryStorage.get().items || [];
  const newItem = { ...item, id: item.id ?? generateId() };
  const newItems = [...items, newItem];
  $inventoryStorage.setKey("items", newItems);
  return newItem;
}

function updateItemById(id: string, updates: Partial<InventoryItem>): boolean {
  if (!id) return false;
  const items = $inventoryStorage.get().items || [];
  let updated = false;
  const newItems = items.map((it) => {
    if (it.id === id) {
      updated = true;
      return { ...it, ...updates };
    }
    return it;
  });
  if (updated) {
    $inventoryStorage.setKey("items", newItems);
  }
  return updated;
}

function removeItemById(id: string): boolean {
  const items = $inventoryStorage.get().items || [];
  const newItems = items.filter((it) => it.id !== id);
  const removed = newItems.length !== items.length;
  if (removed) {
    $inventoryStorage.setKey("items", newItems);
  }
  return removed;
}

function removeItemByBarcode(barcode: string): boolean {
  const items = $inventoryStorage.get().items || [];
  const newItems = items.filter((it) => it.barcode !== barcode);
  const removed = newItems.length !== items.length;
  if (removed) {
    $inventoryStorage.setKey("items", newItems);
  }
  return removed;
}

function findItemByBarcode(barcode: string): InventoryItem | undefined {
  const items = $inventoryStorage.get().items || [];
  return items.find((it) => it.barcode === barcode);
}

function clearInventory() {
  $inventoryStorage.set({ items: [] });
}

export {
  $inventoryStorage,
  setItems,
  addItem,
  updateItemById,
  removeItemById,
  removeItemByBarcode,
  findItemByBarcode,
  clearInventory,
  type InventoryItem,
  type PriceOption,
};
