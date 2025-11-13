import { persistentMap } from "@nanostores/persistent";

type StoredInvoices = {
  invoices: string[];
};

// Metadata for generated invoices (not encoded in invoice string)
export interface GeneratedInvoiceMeta {
  paymentStatus: "waiting_payment" | "payment_issue" | "payment_received";
  paymentNotes: string;
  deliveryStatus: "sent" | "delivery_issue" | "received_item";
  deliveryNotes: string;
  overallStatus:
    | "waiting"
    | "in_progress"
    | "issue_detected"
    | "cancelled"
    | "completed";
  updatedAt: number;
}

interface GeneratedInvoiceMetaStoreShape {
  meta: Record<string, GeneratedInvoiceMeta>;
}

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

// Separate persistent storage for metadata about generated invoices
const $generatedInvoiceMetaStorage =
  persistentMap<GeneratedInvoiceMetaStoreShape>(
    "storedInvoices:generatedMeta",
    { meta: {} },
    {
      encode(value) {
        return JSON.stringify(value);
      },
      decode(value) {
        try {
          return JSON.parse(value);
        } catch (e) {
          console.error("Failed to decode storedInvoices:generatedMeta:", e);
          return { meta: {} } as GeneratedInvoiceMetaStoreShape;
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

// Metadata helpers (generated invoices only)
function getGeneratedInvoiceMeta(
  code: string
): GeneratedInvoiceMeta | undefined {
  const c = normalize(code);
  if (!c) return undefined;
  const store = $generatedInvoiceMetaStorage.get();
  return store.meta[c];
}

function updateGeneratedInvoiceMeta(
  code: string,
  partial: Partial<Omit<GeneratedInvoiceMeta, "updatedAt">>
): GeneratedInvoiceMeta | undefined {
  const c = normalize(code);
  if (!c) return undefined;
  // Ensure invoice exists (only allow meta for stored generated invoices)
  if (!hasGeneratedInvoice(c)) return undefined;
  const current = getGeneratedInvoiceMeta(c) || {
    paymentStatus: "waiting_payment",
    paymentNotes: "",
    deliveryStatus: "sent",
    deliveryNotes: "",
    overallStatus: "waiting",
    updatedAt: Date.now(),
  };
  const next: GeneratedInvoiceMeta = {
    ...current,
    ...partial,
    updatedAt: Date.now(),
  };
  const root = $generatedInvoiceMetaStorage.get();
  $generatedInvoiceMetaStorage.set({ meta: { ...root.meta, [c]: next } });
  return next;
}

function clearAllGeneratedInvoiceMeta() {
  $generatedInvoiceMetaStorage.set({ meta: {} });
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
  $generatedInvoiceMetaStorage,
  getGeneratedInvoiceMeta,
  updateGeneratedInvoiceMeta,
  clearAllGeneratedInvoiceMeta,
  $receivedInvoiceStorage,
  hasReceivedInvoice,
  saveReceivedInvoice,
  removeReceivedInvoice,
  clearReceivedInvoices,
};
