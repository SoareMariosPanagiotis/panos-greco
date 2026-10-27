import { Suspense } from "react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, gql } from "@/lib/catalog";
import {
    formatOrderDate,
    ORDER_STATUSES,
    paymentLabel,
    pluralRo,
    type OrderStatus,
} from "@/lib/orders";

type OrderRow = {
    id: string;
    orderNumber: number;
    status: string;
    customerName: string;
    phone: string;
    deliveryName: string;
    city: string | null;
    total: string;
    paymentStatus: string;
    createdAt: string;
};

// Lista + câte comenzi sunt în fiecare stare (câte un alias pentru fiecare)
type OrdersData = { list: { nodes: OrderRow[] } } & Record<OrderStatus, { totalCount: number }>;

// Taburile de sus: „Toate” + câte unul pentru fiecare stare
const tabs: { status: OrderStatus | null; label: string }[] = [
    { status: null, label: "Toate" },
    { status: "new", label: "Noi" },
    { status: "confirmed", label: "Confirmate" },
    { status: "ready_for_pickup", label: "De ridicat" },
    { status: "shipped", label: "Expediate" },
    { status: "delivered", label: "Livrate" },
    { status: "cancelled", label: "Anulate" },
];

// O singură cerere aduce și lista, și numerele din taburi
const query = `
  query AdminOrders($condition: OrderCondition) {
    list: allOrders(orderBy: CREATED_AT_DESC, condition: $condition, first: 100) {
      nodes {
        id orderNumber status customerName phone
        deliveryName city total paymentStatus createdAt
      }
    }
    new: allOrders(condition: { status: "new" }) { totalCount }
    confirmed: allOrders(condition: { status: "confirmed" }) { totalCount }
    ready_for_pickup: allOrders(condition: { status: "ready_for_pickup" }) { totalCount }
    shipped: allOrders(condition: { status: "shipped" }) { totalCount }
    delivered: allOrders(condition: { status: "delivered" }) { totalCount }
    cancelled: allOrders(condition: { status: "cancelled" }) { totalCount }
  }
`;

async function OrdersList({ searchParams }: { searchParams: Promise<{ stare?: string }> }) {
    const { token } = await requireAdmin();
    const { stare } = await searchParams;

    // Acceptăm doar stări care există; orice altceva din adresă înseamnă „Toate”
    const active = ORDER_STATUSES.find((status) => status === stare) ?? null;

    const data = await gql<OrdersData>(
        query,
        { condition: active ? { status: active } : {} },
        token,
    );
    const orders = data.list.nodes;
    const all = ORDER_STATUSES.reduce((sum, status) => sum + data[status].totalCount, 0);

    return (
        <>
            <p className="mt-1 text-neutral-600">{pluralRo(all, "comandă", "comenzi")} în total</p>

            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filtrează după stare">
                {tabs.map((tab) => {
                    const count = tab.status ? data[tab.status].totalCount : all;
                    const isActive = tab.status === active;

                    return (
                        <Link
                            key={tab.label}
                            href={tab.status ? `/admin/comenzi?stare=${tab.status}` : "/admin/comenzi"}
                            aria-current={isActive ? "page" : undefined}
                            className={`rounded-full border px-3 py-1 text-sm transition ${
                                isActive
                                    ? "border-olive bg-olive text-white"
                                    : "bg-white text-neutral-700 hover:border-olive"
                            }`}
                        >
                            {tab.label}{" "}
                            <span className={isActive ? "text-white/80" : "text-neutral-400"}>{count}</span>
                        </Link>
                    );
                })}
            </nav>

            {orders.length === 0 ? (
                <p className="mt-6 rounded-xl border bg-white p-8 text-center text-neutral-500">
                    Nicio comandă aici.
                </p>
            ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-neutral-50 text-neutral-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Comanda</th>
                            <th className="px-4 py-3 font-medium">Client</th>
                            <th className="px-4 py-3 font-medium">Livrare</th>
                            <th className="px-4 py-3 text-right font-medium">Total</th>
                            <th className="px-4 py-3 font-medium">Stare</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {orders.map((order) => (
                            <tr
                                key={order.id}
                                className={order.status === "new" ? "bg-amber-50" : "hover:bg-olive-light"}
                            >
                                <td className="px-4 py-3">
                                    <Link
                                        href={`/admin/comenzi/${order.orderNumber}`}
                                        className="font-medium text-olive hover:underline"
                                    >
                                        #{order.orderNumber}
                                    </Link>
                                    <p className="text-xs text-neutral-500">{formatOrderDate(order.createdAt)}</p>
                                </td>
                                <td className="px-4 py-3">
                                    {order.customerName}
                                    <p>
                                        <a href={`tel:${order.phone}`} className="text-xs text-neutral-500 hover:underline">
                                            {order.phone}
                                        </a>
                                    </p>
                                </td>
                                <td className="px-4 py-3">
                                    {order.deliveryName}
                                    {order.city && <p className="text-xs text-neutral-500">{order.city}</p>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="whitespace-nowrap font-medium">{formatPrice(order.total)}</span>
                                    <p
                                        className={`text-xs ${
                                            order.paymentStatus === "paid" ? "text-green-700" : "text-neutral-500"
                                        }`}
                                    >
                                        {paymentLabel(order.paymentStatus)}
                                    </p>
                                </td>
                                <td className="px-4 py-3">
                                    <OrderStatusBadge status={order.status} />
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}

export default function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ stare?: string }> }) {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/admin" className="text-sm text-olive hover:underline">
                ← Administrare
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Comenzi</h1>
            <Suspense fallback={<p className="mt-6">Se încarcă comenzile...</p>}>
                <OrdersList searchParams={searchParams} />
            </Suspense>
        </main>
    );
}