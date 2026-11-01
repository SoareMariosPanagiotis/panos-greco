import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
    ORDER_VIEW_FIELDS,
    ORDER_VIEW_ITEM_FIELDS,
    OrderView,
    type OrderHistoryEntry,
    type OrderViewData,
    type OrderViewItem,
} from "@/components/order-view";
import { requireCustomer } from "@/lib/auth";
import { gql } from "@/lib/catalog";

export const metadata: Metadata = {
    title: "Comanda ta · Panos Greco",
    robots: { index: false, follow: false },
};

type MyOrder = OrderViewData & {
    orderItemsByOrderId: { nodes: OrderViewItem[] };
    orderStatusHistoriesByOrderId: { nodes: OrderHistoryEntry[] };
};

// Comanda, produsele și istoricul, într-o singură cerere
const query = `
  query MyOrder($number: Int!) {
    orderByOrderNumber(orderNumber: $number) {
      ${ORDER_VIEW_FIELDS}
      orderItemsByOrderId(orderBy: PRODUCT_NAME_ASC) {
        nodes { ${ORDER_VIEW_ITEM_FIELDS} }
      }
      orderStatusHistoriesByOrderId(orderBy: CREATED_AT_ASC) {
        nodes { id status createdAt }
      }
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
