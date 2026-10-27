// Stările unei comenzi, în ordinea din diagramă
export const ORDER_STATUSES = [
    "new",
    "confirmed",
    "ready_for_pickup",
    "shipped",
    "delivered",
    "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Denumirile stărilor, pentru clienți și pentru admin
export const ORDER_STATUS_LABELS: Record<string, string> = {
    new: "Nouă",
    confirmed: "Confirmată",
    ready_for_pickup: "Gata de ridicare",
    shipped: "Expediată",
    delivered: "Livrată",
    cancelled: "Anulată",
};

// Culorile etichetelor din admin: galben = te așteaptă pe tine, verde = gata
export const ORDER_STATUS_STYLES: Record<string, string> = {
    new: "bg-amber-100 text-amber-800",
    confirmed: "bg-sky-100 text-sky-800",
    ready_for_pickup: "bg-violet-100 text-violet-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-neutral-200 text-neutral-600",
};

// Starea plății merge separat de starea comenzii
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    pending: "neplătită",
    paid: "plătită",
    refunded: "rambursată",
};

export function statusLabel(status: string) {
    return ORDER_STATUS_LABELS[status] ?? status;
}

export function paymentLabel(status: string) {
    return PAYMENT_STATUS_LABELS[status] ?? status;
}

// Data și ora în fusul orar al României, ex: „27 oct. 2026, 23:51”
export function formatOrderDate(iso: string) {
    return new Date(iso).toLocaleString("ro-RO", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Bucharest",
    });
}

// Pluralul în română: 1 comandă, 2 comenzi, 20 de comenzi
export function pluralRo(n: number, one: string, many: string) {
    if (n === 1) return `1 ${one}`;
    const de = n !== 0 && (n % 100 === 0 || n % 100 >= 20) ? "de " : "";
    return `${n} ${de}${many}`;
}