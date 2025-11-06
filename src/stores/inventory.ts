import { persistentMap } from "@nanostores/persistent";
import { v4 as uuidv4 } from "uuid";

export type PriceOption = {
  asset: string;
  price: number;
};

export type InventoryItem = {
  id?: string;
  barcode?: string;
  name: string;
  category: string;
  description?: string;
  quantity?: number;
  location?: string;
  unitPrice?: string;
  reorderLevel?: number;
  supplier?: string;
  unit?: string;
  lastModified?: string; // ISO timestamp
  prices: PriceOption[];
};

type StoredInventory = {
  items: InventoryItem[];
};

type StoredCategories = {
  categories: string[];
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

const $categoriesStorage = persistentMap<StoredCategories>(
  "storedCategories:",
  {
    categories: [],
  },
  {
    encode(value) {
      return JSON.stringify(value);
    },
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error("Failed to decode storedCategories:", e);
        return { categories: [] } as StoredCategories;
      }
    },
  }
);

function getCategories(): string[] {
  return $categoriesStorage.get().categories || [];
}

function addCategory(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return false;
  const cats = $categoriesStorage.get().categories || [];
  if (cats.includes(n)) return false;
  const newCats = [...cats, n];
  $categoriesStorage.setKey("categories", newCats);
  return true;
}

function removeCategory(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return false;
  const cats = $categoriesStorage.get().categories || [];
  const newCats = cats.filter((c) => c !== n);
  const removed = newCats.length !== cats.length;
  if (removed) {
    $categoriesStorage.setKey("categories", newCats);
    // Update inventory items that referenced this category to empty string
    const items = $inventoryStorage.get().items || [];
    const newItems = items.map((it) =>
      it.category === n ? { ...it, category: "" } : it
    );
    if (JSON.stringify(items) !== JSON.stringify(newItems)) {
      $inventoryStorage.setKey("items", newItems);
    }
  }
  return removed;
}

function updateCategory(oldName: string, newName: string): boolean {
  const o = (oldName || "").trim();
  const n = (newName || "").trim();
  if (!o || !n) return false;
  const cats = $categoriesStorage.get().categories || [];
  if (!cats.includes(o)) return false;
  if (cats.includes(n) && o !== n) return false;
  const newCats = cats.map((c) => (c === o ? n : c));
  $categoriesStorage.setKey("categories", newCats);
  // Update inventory items using this category
  const items = $inventoryStorage.get().items || [];
  const newItems = items.map((it) =>
    it.category === o ? { ...it, category: n } : it
  );
  if (JSON.stringify(items) !== JSON.stringify(newItems)) {
    $inventoryStorage.setKey("items", newItems);
  }
  return true;
}

function setItems(items: InventoryItem[]) {
  $inventoryStorage.setKey("items", items);
}

function generateId() {
  return uuidv4();
}

function addItem(item: InventoryItem) {
  const items = $inventoryStorage.get().items || [];
  // Normalize and provide defaults for new fields to avoid breaking callers
  const normalizedQuantity =
    item.quantity !== undefined && Number.isFinite(Number(item.quantity))
      ? Number(item.quantity)
      : undefined;

  const normalizedReorder =
    item.reorderLevel !== undefined &&
    Number.isFinite(Number(item.reorderLevel))
      ? Number(item.reorderLevel)
      : undefined;

  const newItem: InventoryItem = {
    ...item,
    id: item.id ?? generateId(),
    description: item.description ?? undefined,
    quantity: normalizedQuantity,
    location: item.location ?? undefined,
    unitPrice:
      item.unitPrice !== undefined ? String(item.unitPrice) : undefined,
    reorderLevel: normalizedReorder,
    supplier: item.supplier ?? undefined,
    unit: item.unit ?? undefined,
    lastModified: new Date().toISOString(),
  };
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
      const normalizedUpdates: Partial<InventoryItem> = { ...updates };
      if (
        updates.quantity !== undefined &&
        Number.isFinite(Number(updates.quantity))
      ) {
        normalizedUpdates.quantity = Number(updates.quantity);
      }
      if (updates.unitPrice !== undefined) {
        normalizedUpdates.unitPrice = String(updates.unitPrice);
      }
      if (
        updates.reorderLevel !== undefined &&
        Number.isFinite(Number(updates.reorderLevel))
      ) {
        normalizedUpdates.reorderLevel = Number(updates.reorderLevel);
      }
      // update lastModified timestamp
      normalizedUpdates.lastModified = new Date().toISOString();
      return { ...it, ...normalizedUpdates };
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
  $categoriesStorage,
  setItems,
  addItem,
  updateItemById,
  removeItemById,
  removeItemByBarcode,
  findItemByBarcode,
  clearInventory,
  getCategories,
  addCategory,
  removeCategory,
  updateCategory,
};
