import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
    ORDER_INVOICE_FIELDS,
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
import { parseInvoiceFiles } from "@/lib/invoices";
import { parseJson } from "@/lib/withdrawals";

export const metadata: Metadata = {
    title: "Comanda ta · Panos Greco",
    robots: { index: false, follow: false },
};

type MyOrder = OrderViewData & {
    id: string;
    canCancel: boolean; // migrația 031: n-a plecat încă, clientul o poate anula
    canWithdraw: boolean;
    withdrawalDeadline: string | null;
    orderItemsByOrderId: { nodes: OrderViewItem[] };
    orderStatusHistoriesByOrderId: { nodes: OrderHistoryEntry[] };
    // Câmp calculat (migrația 026): data și starea cererilor de retur, ca JSON
    withdrawalRequests: unknown;
    // Câmp calculat (migrația 030): facturile emise, ca JSON
    invoiceFiles: string | null;
};

type WithdrawalRequest = { id: string; createdAt: string; status: string };

// Comanda, produsele, istoricul, cererile de retur și facturile, într-o singură cerere
const query = `
  query MyOrder($number: Int!) {
    orderByOrderNumber(orderNumber: $number) {
      ${ORDER_VIEW_FIELDS}
      ${ORDER_WITHDRAWAL_FIELDS}
      ${ORDER_INVOICE_FIELDS}
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
                canCancel: order.canCancel,
                canWithdraw: order.canWithdraw,
                deadline: order.withdrawalDeadline,
                requests: parseJson<WithdrawalRequest[]>(order.withdrawalRequests) ?? [],
            }}
            invoices={{ orderId: order.id, files: parseInvoiceFiles(order.invoiceFiles) }}
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
