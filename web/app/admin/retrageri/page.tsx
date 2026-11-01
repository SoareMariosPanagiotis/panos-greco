import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { WITHDRAWAL_STATUS_STYLES, formatRequestTime, withdrawalStatusLabel } from "@/lib/withdrawals";

export const metadata: Metadata = { title: "Retrageri · Administrare" };

type WithdrawalRow = {
    id: string;
    createdAt: string;
    status: string;
    customerName: string;
    orderByOrderId: { orderNumber: number } | null;
    withdrawalItemsByWithdrawalId: { nodes: { quantity: number }[] };
};

// Cele mai noi primele. Cererea se rezolvă din pagina comenzii.
const query = `
  query AdminWithdrawals {
    allWithdrawals(orderBy: CREATED_AT_DESC, first: 200) {
      nodes {
        id createdAt status customerName
        orderByOrderId { orderNumber }
        withdrawalItemsByWithdrawalId { nodes { quantity } }
      }
    }
  }
`;

async function WithdrawalsList() {
    const { token } = await requireAdmin();
    const data = await gql<{ allWithdrawals: { nodes: WithdrawalRow[] } }>(query, {}, token);
    const rows = data.allWithdrawals.nodes;

    if (rows.length === 0) {
        return <p className="mt-6 rounded-xl border bg-white p-6 text-neutral-600">Nicio cerere de retragere.</p>;
    }

    return (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50 text-left text-neutral-600">
                    <tr>
                        <th className="px-4 py-3 font-medium">Trimisă pe</th>
                        <th className="px-4 py-3 font-medium">Comanda</th>
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Bucăți</th>
                        <th className="px-4 py-3 font-medium">Stare</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.map((row) => {
                        const pieces = row.withdrawalItemsByWithdrawalId.nodes.reduce((sum, item) => sum + item.quantity, 0);
                        const number = row.orderByOrderId?.orderNumber;
                        return (
                            <tr key={row.id} className={row.status === "received" ? "bg-amber-50/60" : ""}>
                                <td className="whitespace-nowrap px-4 py-3">{formatRequestTime(row.createdAt)}</td>
                                <td className="px-4 py-3">
                                    {number && (
                                        <Link href={`/admin/comenzi/${number}`} className="font-medium text-olive hover:underline">
                                            #{number}
                                        </Link>
                                    )}
                                </td>
                                <td className="px-4 py-3">{row.customerName}</td>
                                <td className="px-4 py-3">{pieces}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            WITHDRAWAL_STATUS_STYLES[row.status] ?? "bg-neutral-100 text-neutral-700"
                                        }`}
                                    >
                                        {withdrawalStatusLabel(row.status)}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminWithdrawalsPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/admin" className="text-sm text-olive hover:underline">
                ← Administrare
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Cereri de retragere</h1>
            <p className="mt-1 text-neutral-600">
                Le trimit clienții cu butonul „Retrageți-vă din contract aici”. Deschide comanda ca să marchezi pașii.
            </p>
            <Suspense fallback={<p className="mt-6">Se încarcă cererile...</p>}>
                <WithdrawalsList />
            </Suspense>
        </main>
    );
}
