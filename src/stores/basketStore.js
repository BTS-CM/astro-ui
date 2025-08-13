import { persistentAtom } from '@nanostores/persistent';

// Each item in the basket will store the operations and the page URL
// where they were added from.
// Example: { operations: [...], pageUrl: '/some/page', pageTitle: 'Some Page Title', id: Date.now() }
export const basketItems = persistentAtom('basketItems_v1', [], { // Added _v1 for potential future migrations
  encode: JSON.stringify,
  decode: JSON.parse,
});

export function addToBasket(operations, pageUrl, pageTitle) {
  const currentItems = basketItems.get();
  // Simple add, consider if merging or updating existing entries from the same page is needed
  basketItems.set([...currentItems, { operations, pageUrl, pageTitle, id: Date.now() }]);
  console.log("Item added to basket:", { operations, pageUrl, pageTitle });
}

export function removeFromBasket(itemId) {
  basketItems.set(basketItems.get().filter(item => item.id !== itemId));
  console.log("Item removed from basket:", itemId);
}

export function clearBasket() {
  basketItems.set([]);
  console.log("Basket cleared");
}

export function getBasketItems() {
  return basketItems.get();
}

export function getCombinedOperations() {
  const items = basketItems.get();
  return items.reduce((acc, item) => acc.concat(item.operations), []);
}
