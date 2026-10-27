import { ORDER_STATUS_STYLES, statusLabel } from "@/lib/orders";

// Eticheta colorată cu starea comenzii (o folosim în listă și în pagina comenzii)
export function OrderStatusBadge({ status }: { status: string }) {
    const colors = ORDER_STATUS_STYLES[status] ?? "bg-neutral-100 text-neutral-700";

    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}
        >
            {statusLabel(status)}
        </span>
    );
}