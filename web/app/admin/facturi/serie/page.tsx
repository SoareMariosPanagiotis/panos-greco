import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceSeriesForm } from "@/components/admin/invoice-series-form";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";

export const metadata: Metadata = { title: "Seria facturilor · Administrare" };

type Series = { code: string; nextNumber: number; isActive: boolean };

const seriesQuery = `
  query AdminInvoiceSeries {
    allInvoiceSeriesCounters(orderBy: CREATED_AT_ASC) { nodes { code nextNumber isActive } }
  }
`;

const usedQuery = `
  query SeriesUsed($code: String!) {
    allInvoices(condition: { series: $code }) { totalCount }
  }
`;

async function SeriesSettings() {
    const { token } = await requireAdmin();
    const data = await gql<{ allInvoiceSeriesCounters: { nodes: Series[] } }>(seriesQuery, {}, token);
    const all = data.allInvoiceSeriesCounters.nodes;
    const active = all.find((series) => series.isActive);
    if (!active) return <p className="mt-6">Nu există o serie activă.</p>;

    const used = await gql<{ allInvoices: { totalCount: number } }>(usedQuery, { code: active.code }, token);
    const issued = used.allInvoices.totalCount;

    return (
        <>
            <h1 className="mt-2 text-3xl font-bold text-olive">Seria facturilor</h1>
            <div className="mt-4 max-w-2xl space-y-3 text-neutral-700">
                <p>
                    Seria activă: <strong>{active.code}</strong>. Următoarea factură:{" "}
                    <strong>
                        {active.code} {active.nextNumber}
                    </strong>
                    .
                </p>
                <p className="text-sm">
                    Facturile din site au o serie a lor, diferită de seriile din MicroERP: două programe care dau
                    numere în aceeași serie ar putea da același număr de două ori. Codul seriei îl stabilești cu
                    contabila.
                </p>
                {issued === 0 ? (
                    <p className="text-sm">
                        Seria nu are încă facturi, așa că poți schimba liber codul și primul număr.
                    </p>
                ) : (
                    <p className="text-sm">
                        Seria are {issued} {issued === 1 ? "factură" : "facturi"}, așa că numerotarea ei continuă
                        singură, fără goluri. Poți doar să treci la o serie nouă (de exemplu, de la 1 ianuarie).
                    </p>
                )}
            </div>

            <div className="mt-6 max-w-2xl">
                <InvoiceSeriesForm code={active.code} nextNumber={active.nextNumber} used={issued > 0} />
            </div>

            {all.length > 1 && (
                <section className="mt-8 max-w-2xl">
                    <h2 className="font-semibold">Serii folosite</h2>
                    <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                        {all.map((series) => (
                            <li key={series.code}>
                                {series.code}: următorul număr ar fi {series.nextNumber}
                                {series.isActive ? " (activă)" : ""}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}

export default function InvoiceSeriesPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/admin/facturi" className="text-sm text-olive hover:underline">
                ← Facturi
            </Link>
            <Suspense fallback={<p className="mt-6">Se încarcă seria...</p>}>
                <SeriesSettings />
            </Suspense>
        </main>
    );
}
