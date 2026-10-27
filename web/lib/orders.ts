// Denumirile stărilor unei comenzi, pentru clienți și pentru admin
export const ORDER_STATUS_LABELS: Record<string, string> = {
    new: "Nouă",
    confirmed: "Confirmată",
    ready_for_pickup: "Gata de ridicare",
    shipped: "Expediată",
    delivered: "Livrată",
    cancelled: "Anulată",
};

export function statusLabel(status: string) {
    return ORDER_STATUS_LABELS[status] ?? status;
}