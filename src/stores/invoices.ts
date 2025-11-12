import { persistentMap } from "@nanostores/persistent";

type StoredInvoices = {
  invoices: string[];
};

// Generated invoices (created by me)
const $generatedInvoiceStorage = persistentMap<StoredInvoices>(
  "storedInvoices:generated",
  { invoices: [] },
  {
    encode(value) {
      return JSON.stringify(value);
    },
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error("Failed to decode storedInvoices:generated:", e);
        return { invoices: [] } as StoredInvoices;
      }
    },
  }
);

// Received invoices (sent to me)
const $receivedInvoiceStorage = persistentMap<StoredInvoices>(
  "storedInvoices:received",
  { invoices: [] },
  {
    encode(value) {
      return JSON.stringify(value);
    },
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error("Failed to decode storedInvoices:received:", e);
        return { invoices: [] } as StoredInvoices;
      }
    },
  }
);

function normalize(code: string): string {
  return (code || "").trim();
}

// Generated helpers
function hasGeneratedInvoice(code: string): boolean {
  const c = normalize(code);
  if (!c) return false;
  const invoices = $generatedInvoiceStorage.get().invoices || [];
  return invoices.includes(c);
}

function saveGeneratedInvoice(code: string): boolean {
  const c = normalize(code);
  if (!c) return false;
  if (hasGeneratedInvoice(c)) return false;
  const invoices = $generatedInvoiceStorage.get().invoices || [];
  $generatedInvoiceStorage.setKey("invoices", [...invoices, c]);
  return true;
}

function removeGeneratedInvoice(code: string): boolean {
  const c = normalize(code);
  if (!c) return false;
  const invoices = $generatedInvoiceStorage.get().invoices || [];
  const next = invoices.filter((x) => x !== c);
  if (next.length === invoices.length) return false;
  $generatedInvoiceStorage.setKey("invoices", next);
  return true;
}

function clearGeneratedInvoices() {
  $generatedInvoiceStorage.set({ invoices: [] });
}

// Received helpers
function hasReceivedInvoice(code: string): boolean {
  const c = normalize(code);
  if (!c) return false;
  const invoices = $receivedInvoiceStorage.get().invoices || [];
  return invoices.includes(c);
}

function saveReceivedInvoice(code: string): boolean {
  const c = normalize(code);
  if (!c) return false;
  if (hasReceivedInvoice(c)) return false;
  const invoices = $receivedInvoiceStorage.get().invoices || [];
  $receivedInvoiceStorage.setKey("invoices", [...invoices, c]);
  return true;
}

function removeReceivedInvoice(code: string): boolean {
  const c = normalize(code);
  if (!c) return false;
  const invoices = $receivedInvoiceStorage.get().invoices || [];
  const next = invoices.filter((x) => x !== c);
  if (next.length === invoices.length) return false;
  $receivedInvoiceStorage.setKey("invoices", next);
  return true;
}

function clearReceivedInvoices() {
  $receivedInvoiceStorage.set({ invoices: [] });
}

export {
  $generatedInvoiceStorage,
  hasGeneratedInvoice,
  saveGeneratedInvoice,
  removeGeneratedInvoice,
  clearGeneratedInvoices,
  $receivedInvoiceStorage,
  hasReceivedInvoice,
  saveReceivedInvoice,
  removeReceivedInvoice,
  clearReceivedInvoices,
};
