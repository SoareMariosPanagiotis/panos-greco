import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
    ORDER_VIEW_FIELDS,
    ORDER_VIEW_ITEM_FIELDS,
    ORDER_WITHDRAWAL_FIELDS,
    OrderView,
    type OrderHistoryEntry,
    type OrderViewData,
    type OrderViewItem,
} from "@/components/order-view";
import { requireCustomer } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { parseJson } from "@/lib/withdrawals";

export const metadata: Metadata = {
    title: "Comanda ta · Panos Greco",
    robots: { index: false, follow: false },
};

type MyOrder = OrderViewData & {
    id: string;
    canWithdraw: boolean;
    withdrawalDeadline: string | null;
    orderItemsByOrderId: { nodes: OrderViewItem[] };
    orderStatusHistoriesByOrderId: { nodes: OrderHistoryEntry[] };
    // Câmp calculat (migrația 026): data și starea cererilor de retur, ca JSON
    withdrawalRequests: unknown;
};

type WithdrawalRequest = { id: string; createdAt: string; status: string };

// Comanda, produsele, istoricul și cererile de retur, într-o singură cerere
const query = `
  query MyOrder($number: Int!) {
    orderByOrderNumber(orderNumber: $number) {
      ${ORDER_VIEW_FIELDS}
      ${ORDER_WITHDRAWAL_FIELDS}
      orderItemsByOrderId(orderBy: PRODUCT_NAME_ASC) {
        nodes { ${ORDER_VIEW_ITEM_FIELDS} }
      }
      orderStatusHistoriesByOrderId(orderBy: CREATED_AT_ASC) {
        nodes { id status createdAt }
      }
      withdrawalRequests
    }
  }
`;

async function MyOrderView({ params }: { params: Promise<{ numar: string }> }) {
    // Neconectat → pagina de intrare. Admin → administrarea.
    const { token } = await requireCustomer();
    const { numar } = await params;

    // Ce vine din adresă trebuie să fie chiar un număr
    if (!/^\d{1,9}$/.test(numar)) notFound();

    // Trimitem biletul clientului: RLS (politica orders_own) îi dă comanda
    // doar dacă e a lui. Pentru comanda altcuiva primim null, deci pagina 404.
    const data = await gql<{ orderByOrderNumber: MyOrder | null }>(
        query,
        { number: Number(numar) },
        token,
    );
    const order = data.orderByOrderNumber;
    if (!order) notFound();

    return (
        <OrderView
            order={order}
            items={order.orderItemsByOrderId.nodes}
            place="account"
            history={order.orderStatusHistoriesByOrderId.nodes}
            withdrawal={{
                orderId: order.id,
                canWithdraw: order.canWithdraw,
                deadline: order.withdrawalDeadline,
                requests: parseJson<WithdrawalRequest[]>(order.withdrawalRequests) ?? [],
            }}
        />
    );
}

export default function MyOrderPage({ params }: { params: Promise<{ numar: string }> }) {
    return (
        <main className="mx-auto w-full max-w-4xl px-8 py-10">
            <Suspense fallback={<p>Se încarcă comanda...</p>}>
                <MyOrderView params={params} />
            </Suspense>
        </main>
    );
}
