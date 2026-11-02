import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { formatInvoiceDate, formatMoney, invoiceKindLabel, invoiceNumber, invoicePdfHref } from "@/lib/invoices";
import { formatOrderDate } from "@/lib/orders";

export const metadata: Metadata = { title: "Facturi · Administrare" };

type DraftRow = {
    id: string;
    kind: string;
    buyerName: string;
    total: string;
    createdAt: string;
    orderByOrderId: { orderNumber: number } | null;
    invoiceByStornoOf: { series: string | null; number: number | null } | null;
};

type IssuedRow = {
    id: string;
    kind: string;
    series: string | null;
    number: number | null;
    issueDate: string | null;
    buyerName: string;
    total: string;
    orderByOrderId: { orderNumber: number } | null;
};

type InvoicesData = {
    allInvoiceSeriesCounters: { nodes: { code: string; nextNumber: number }[] };
    drafts: { nodes: DraftRow[] };
    issued: { totalCount: number; nodes: IssuedRow[] };
};

// Sus: ce așteaptă confirmarea ta. Jos: ultimele facturi emise, cele mai noi primele.
const query = `
  query AdminInvoices {
    allInvoiceSeriesCounters(condition: { isActive: true }) { nodes { code nextNumber } }
    drafts: allInvoices(condition: { status: "draft" }, orderBy: CREATED_AT_DESC) {
      nodes {
        id kind buyerName total createdAt
        orderByOrderId { orderNumber }
        invoiceByStornoOf { series number }
      }
    }
    issued: allInvoices(condition: { status: "issued" }, orderBy: ISSUED_AT_DESC, first: 200) {
      totalCount
      nodes { id kind series number issueDate buyerName total orderByOrderId { orderNumber } }
    }
  }
`;

const th = "px-4 py-3 font-medium";
const td = "px-4 py-3";

function OrderLink({ order }: { order: { orderNumber: number } | null }) {
    if (!order) return null;
    return (
        <Link href={`/admin/comenzi/${order.orderNumber}`} className="text-olive hover:underline">
            #{order.orderNumber}
        </Link>
    );
}

async function InvoicesList() {
    const { token } = await requireAdmin();
    const data = await gql<InvoicesData>(query, {}, token);
    const series = data.allInvoiceSeriesCounters.nodes[0];
    const drafts = data.drafts.nodes;
    const issued = data.issued.nodes;

    return (
        <>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-olive">Facturi</h1>
                    {series && (
                        <p className="mt-1 text-neutral-600">
                            Seria {series.code} · următoarea factură: {series.code} {series.nextNumber}
                        </p>
                    )}
                </div>
                <Link href="/admin/facturi/serie" className="text-sm text-olive hover:underline">
                    Schimbă seria
                </Link>
            </div>

            <section className="mt-8">
                <h2 className="text-lg font-semibold">De emis</h2>
                {drafts.length === 0 ? (
                    <p className="mt-3 rounded-xl border bg-white p-6 text-neutral-600">
                        Nicio ciornă. Ciornele apar singure când confirmi o comandă cu livrare.
                    </p>
                ) : (
                    <div className="mt-3 overflow-x-auto rounded-xl border border-amber-400 bg-white">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-amber-50 text-left text-neutral-600">
                                <tr>
                                    <th className={th}>Ciornă</th>
                                    <th className={th}>Comanda</th>
                                    <th className={th}>Client</th>
                                    <th className={`${th} text-right`}>Total</th>
                                    <th className={th}>Făcută pe</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {drafts.map((row) => (
                                    <tr key={row.id}>
                                        <td className={td}>
                                            <Link href={`/admin/facturi/${row.id}`} className="font-medium text-olive hover:underline">
                                                {row.invoiceByStornoOf
                                                    ? `Stornare pentru ${invoiceNumber(row.invoiceByStornoOf)}`
                                                    : "Factură"}
                                            </Link>
                                        </td>
                                        <td className={td}>
                                            <OrderLink order={row.orderByOrderId} />
                                        </td>
                                        <td className={td}>{row.buyerName}</td>
                                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                                            {formatMoney(row.total)} lei
                                        </td>
                                        <td className={`${td} whitespace-nowrap`}>{formatOrderDate(row.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="mt-10">
                <h2 className="text-lg font-semibold">Emise</h2>
                {issued.length === 0 ? (
                    <p className="mt-3 rounded-xl border bg-white p-6 text-neutral-600">Nicio factură emisă încă.</p>
                ) : (
                    <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-neutral-50 text-left text-neutral-600">
                                <tr>
                                    <th className={th}>Număr</th>
                                    <th className={th}>Data</th>
                                    <th className={th}>Tip</th>
                                    <th className={th}>Client</th>
                                    <th className={th}>Comanda</th>
                                    <th className={`${th} text-right`}>Total</th>
                                    <th className={th}>
                                        <span className="sr-only">PDF</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {issued.map((row) => (
                                    <tr key={row.id}>
                                        <td className={`${td} whitespace-nowrap`}>
                                            <Link href={`/admin/facturi/${row.id}`} className="font-medium text-olive hover:underline">
                                                {invoiceNumber(row)}
                                            </Link>
                                        </td>
                                        <td className={`${td} whitespace-nowrap`}>{formatInvoiceDate(row.issueDate)}</td>
                                        <td className={td}>
                                            <span className={row.kind === "storno" ? "text-red-700" : ""}>
                                                {invoiceKindLabel(row.kind)}
                                            </span>
                                        </td>
                                        <td className={td}>{row.buyerName}</td>
                                        <td className={td}>
                                            <OrderLink order={row.orderByOrderId} />
                                        </td>
                                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                                            {formatMoney(row.total)} lei
                                        </td>
                                        <td className={`${td} text-right`}>
                                            {/* PDF-ul arhivat la emitere, același pe care l-a primit clientul (migrația 030) */}
                                            <a
                                                href={invoicePdfHref(row.id)}
                                                target="_blank"
                                                rel="noopener"
                                                className="inline-flex items-center gap-1 font-medium text-olive hover:underline"
                                            >
                                                <FileDown className="size-4" aria-hidden />
                                                PDF
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {data.issued.totalCount > issued.length && (
                    <p className="mt-2 text-sm text-neutral-500">
                        Se văd ultimele {issued.length} din {data.issued.totalCount}.
                    </p>
                )}
            </section>
        </>
    );
}

export default function AdminInvoicesPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/admin" className="text-sm text-olive hover:underline">
                ← Administrare
            </Link>
            <Suspense fallback={<p className="mt-6">Se încarcă facturile...</p>}>
                <InvoicesList />
            </Suspense>
        </main>
    );
}
