import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
    ORDER_VIEW_FIELDS,
    ORDER_VIEW_ITEM_FIELDS,
    OrderView,
    type OrderViewData,
    type OrderViewItem,
} from "@/components/order-view";
import { gql } from "@/lib/catalog";

// Pagină privată: Google nu trebuie s-o pună în căutări
export const metadata: Metadata = {
    title: "Comanda ta · Panos Greco",
    robots: { index: false, follow: false },
};

// Fără cont: comanda se găsește după id-ul lung (uuid) din link, valabil 30 de zile
const query = `
  query Receipt($id: UUID!) {
    orderReceipt(receiptId: $id) { ${ORDER_VIEW_FIELDS} }
    orderReceiptItems(receiptId: $id) {
      nodes { ${ORDER_VIEW_ITEM_FIELDS} }
    }
  }
`;

async function ReceiptView({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Un id invalid (nu e uuid) dă eroare în API: îl tratăm ca „comandă inexistentă”
    const data = await gql<{
        orderReceipt: OrderViewData | null;
        orderReceiptItems: { nodes: OrderViewItem[] };
    }>(query, { id }).catch(() => null);

    const receipt = data?.orderReceipt;
    if (!data || !receipt || !receipt.orderNumber) notFound();

    return <OrderView order={receipt} items={data.orderReceiptItems.nodes} place="receipt" />;
}

export default function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <main className="mx-auto w-full max-w-4xl px-8 py-10">
            <Suspense fallback={<p>Se încarcă comanda...</p>}>
                <ReceiptView params={params} />
            </Suspense>
        </main>
    );
}
