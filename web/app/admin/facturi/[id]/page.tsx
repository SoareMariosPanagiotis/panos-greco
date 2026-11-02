import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    DiscardDraftButton,
    DownloadInvoicePdf,
    InvoiceDraftForm,
    InvoiceEmailStatus,
    InvoicePdfStatus,
    IssueInvoiceButton,
    PrintInvoiceButton,
    ResendInvoiceEmailButton,
    StornoForm,
} from "@/components/admin/invoice-actions";
import { InvoiceDocument } from "@/components/invoice-document";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import {
    INVOICE_FIELDS,
    formatMoney,
    invoiceNumber,
    parseEmailDelivery,
    parsePdfStatus,
    type Invoice,
} from "@/lib/invoices";
import { getShopInfo } from "@/lib/shop-info";

export const metadata: Metadata = { title: "Factură · Administrare" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const query = `
  query AdminInvoice($id: UUID!) {
    invoiceById(id: $id) { ${INVOICE_FIELDS} }
    allInvoiceSeriesCounters(condition: { isActive: true }) { nodes { code nextNumber } }
  }
`;

type InvoiceData = {
    invoiceById: Invoice | null;
    allInvoiceSeriesCounters: { nodes: { code: string; nextNumber: number }[] };
};

const card = "rounded-xl border bg-white p-6";

function StatusBadge({ invoice }: { invoice: Invoice }) {
    const draft = invoice.status === "draft";
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                draft ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
            }`}
        >
            {draft ? "Ciornă, neemisă" : "Emisă"}
        </span>
    );
}

async function InvoiceDetails({ params }: { params: Promise<{ id: string }> }) {
    const { token } = await requireAdmin();
    const { id } = await params;
    if (!UUID.test(id)) notFound();

    const [data, shop] = await Promise.all([gql<InvoiceData>(query, { id }, token), getShopInfo()]);
    const invoice = data.invoiceById;
    if (!invoice) notFound();

    const draft = invoice.status === "draft";
    const storno = invoice.kind === "storno";
    const series = data.allInvoiceSeriesCounters.nodes[0];
    const order = invoice.orderByOrderId;
    const lines = invoice.invoiceLinesByInvoiceId.nodes;
    const stornos = invoice.invoicesByStornoOf.nodes;
    const stornoDraft = stornos.find((item) => item.status === "draft");
    const canStorno = !draft && !storno && !stornoDraft && lines.some((line) => Number(line.remainingQuantity) > 0);
    const title = draft ? "Ciornă de factură" : `${storno ? "Stornare" : "Factura"} ${invoiceNumber(invoice)}`;

    return (
        <>
            {/* Tot ce e în jurul facturii dispare la tipărire: pe hârtie rămâne doar factura */}
            <div className="space-y-6 print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-olive">{title}</h1>
                    <StatusBadge invoice={invoice} />
                </div>
                <p className="-mt-4 text-sm text-neutral-500">
                    {order && (
                        <>
                            Comanda{" "}
                            <Link href={`/admin/comenzi/${order.orderNumber}`} className="text-olive hover:underline">
                                #{order.orderNumber}
                            </Link>
                        </>
                    )}
                    {invoice.invoiceByStornoOf && (
                        <>
                            {" · "}stornează{" "}
                            <Link href={`/admin/facturi/${invoice.invoiceByStornoOf.id}`} className="text-olive hover:underline">
                                factura {invoiceNumber(invoice.invoiceByStornoOf)}
                            </Link>
                        </>
                    )}
                </p>

                {draft ? (
                    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                        <section className={card}>
                            <h2 className="mb-4 font-semibold">{storno ? "Mențiuni" : "Datele clientului"}</h2>
                            <InvoiceDraftForm invoice={invoice} />
                        </section>
                        <section className={`${card} h-fit space-y-4`}>
                            <h2 className="font-semibold">Emitere</h2>
                            <p className="text-sm text-neutral-600">
                                Verifică factura de mai jos. Când e bună, emite-o: primește numărul și data de azi, iar
                                clientul o primește pe email, ca PDF{invoice.buyerEmail ? ` (${invoice.buyerEmail})` : ""}, și
                                o poate descărca de pe pagina comenzii.
                            </p>
                            {!shop.cui || !shop.regCom || !shop.registeredOffice ? (
                                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    Lipsesc datele firmei. Completează-le la{" "}
                                    <Link href="/admin/firma" className="underline">
                                        Datele firmei
                                    </Link>{" "}
                                    înainte de emitere.
                                </p>
                            ) : null}
                            <IssueInvoiceButton
                                invoiceId={invoice.id}
                                nextLabel={series ? `${series.code} ${series.nextNumber}` : null}
                            />
                            <DiscardDraftButton
                                invoiceId={invoice.id}
                                back={order ? `/admin/comenzi/${order.orderNumber}` : "/admin/facturi"}
                            />
                        </section>
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                        <section className={`${card} space-y-4`}>
                            <h2 className="font-semibold">Ce poți face</h2>
                            <InvoicePdfStatus status={parsePdfStatus(invoice.pdfStatus)} />
                            <InvoiceEmailStatus
                                delivery={parseEmailDelivery(invoice.emailDelivery)}
                                buyerEmail={invoice.buyerEmail}
                            />
                            <div className="flex flex-wrap gap-2">
                                <DownloadInvoicePdf invoiceId={invoice.id} />
                                <PrintInvoiceButton title={title} />
                                {invoice.buyerEmail && <ResendInvoiceEmailButton invoiceId={invoice.id} />}
                            </div>
                            {canStorno && (
                                <div className="border-t pt-4">
                                    <h3 className="mb-2 font-medium">Stornare</h3>
                                    <StornoForm invoiceId={invoice.id} lines={lines} />
                                </div>
                            )}
                            {stornoDraft && (
                                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    Are o ciornă de stornare neemisă:{" "}
                                    <Link href={`/admin/facturi/${stornoDraft.id}`} className="underline">
                                        deschide-o
                                    </Link>
                                    .
                                </p>
                            )}
                        </section>

                        {!storno && stornos.length > 0 && (
                            <section className={`${card} h-fit`}>
                                <h2 className="font-semibold">Stornări</h2>
                                <ul className="mt-3 space-y-2 text-sm">
                                    {stornos.map((item) => (
                                        <li key={item.id} className="flex justify-between gap-3">
                                            <Link href={`/admin/facturi/${item.id}`} className="text-olive hover:underline">
                                                {item.status === "draft" ? "Ciornă" : invoiceNumber(item)}
                                            </Link>
                                            <span className="tabular-nums">{formatMoney(item.total)} lei</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-8 print:mt-0">
                <InvoiceDocument invoice={invoice} shop={shop} />
            </div>
        </>
    );
}

export default function AdminInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10 print:max-w-none print:p-0">
            <Link href="/admin/facturi" className="text-sm text-olive hover:underline print:hidden">
                ← Facturi
            </Link>
            <div className="mt-2">
                <Suspense fallback={<p className="mt-6">Se încarcă factura...</p>}>
                    <InvoiceDetails params={params} />
                </Suspense>
            </div>
        </main>
    );
}
