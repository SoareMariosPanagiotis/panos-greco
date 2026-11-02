import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateInvoiceButton } from "@/components/admin/invoice-actions";
import { OrderActions } from "@/components/admin/order-actions";
import { ReturnActions } from "@/components/admin/return-actions";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, gql } from "@/lib/catalog";
import { formatInvoiceDate, formatMoney, invoiceKindLabel, invoiceNumber, invoicePdfHref } from "@/lib/invoices";
import { formatOrderDate, paymentLabel, statusLabel } from "@/lib/orders";
import {
    WITHDRAWAL_STATUS_STYLES,
    formatDeadline,
    formatIban,
    formatRequestTime,
    withdrawalStatusLabel,
} from "@/lib/withdrawals";

type OrderItem = {
    id: string;
    productName: string;
    sizeLabel: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
};

type HistoryEntry = { id: string; status: string; createdAt: string };

// O cerere de retur (tabelul sales.withdrawals, migrația 024), cu produsele ei
type Withdrawal = {
    id: string;
    createdAt: string;
    status: string;
    customerName: string;
    email: string;
    reason: string | null;
    iban: string | null;
    statement: string;
    adminNote: string | null;
    withdrawalItemsByWithdrawalId: {
        nodes: { quantity: number; orderItemByOrderItemId: { productName: string; sizeLabel: string } | null }[];
    };
    // Stornarea făcută automat pentru retur (migrația 029): totalul ei e suma de dat înapoi
    invoicesByWithdrawalId: {
        nodes: { id: string; series: string | null; number: number | null; total: string }[];
    };
};

// Facturile comenzii (migrația 028): factura, eventualele stornări, ciornele
type OrderInvoice = {
    id: string;
    kind: string;
    status: string;
    series: string | null;
    number: number | null;
    issueDate: string | null;
    total: string;
};

type AdminOrder = {
    id: string;
    orderNumber: number;
    status: string;
    createdAt: string;
    customerName: string;
    email: string;
    phone: string;
    deliveryName: string;
    county: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    courier: string | null;
    awb: string | null;
    companyName: string | null;
    companyCui: string | null;
    companyRegNo: string | null;
    companyAddress: string | null; // din migrația 020; comenzile vechi nu o au
    paymentName: string;
    paymentStatus: string;
    subtotal: string;
    discountTotal: string;
    shippingTotal: string;
    paymentFee: string;
    total: string;
    customerNote: string | null;
    withdrawalDeadline: string | null; // câmp calculat: până când se poate retrage clientul
    cancelReason: string | null; // de ce a fost anulată (migrația 029)
    cancelledBy: string | null; // cine a anulat-o: clientul din site sau tu (migrația 031)
    cancelledAt: string | null;
    cancelDetails: string | null; // motivul ales de client
    canInvoice: boolean; // câmp calculat: se poate face acum o ciornă de factură?
    deliveryMethodByDeliveryMethodId: { needsAddress: boolean; needsAwb: boolean } | null;
    orderItemsByOrderId: { nodes: OrderItem[] };
    orderStatusHistoriesByOrderId: { nodes: HistoryEntry[] };
    withdrawalsByOrderId: { nodes: Withdrawal[] };
    invoicesByOrderId: { nodes: OrderInvoice[] };
};

// Comanda + metoda de livrare + produsele + istoricul, într-o singură cerere.
// Legăturile vin din cheile străine: delivery_method_id, order_items.order_id, order_status_history.order_id
const query = `
  query AdminOrder($number: Int!) {
    orderByOrderNumber(orderNumber: $number) {
      id orderNumber status createdAt
      customerName email phone
      deliveryName county city address postalCode courier awb
      companyName companyCui companyRegNo companyAddress
      paymentName paymentStatus
      subtotal discountTotal shippingTotal paymentFee total
      customerNote
      withdrawalDeadline
      cancelReason cancelledBy cancelledAt cancelDetails
      canInvoice
      deliveryMethodByDeliveryMethodId { needsAddress needsAwb }
      orderItemsByOrderId(orderBy: PRODUCT_NAME_ASC) {
        nodes { id productName sizeLabel unitPrice quantity lineTotal }
      }
      orderStatusHistoriesByOrderId(orderBy: CREATED_AT_ASC) {
        nodes { id status createdAt }
      }
      withdrawalsByOrderId(orderBy: CREATED_AT_ASC) {
        nodes {
          id createdAt status customerName email reason iban statement adminNote
          withdrawalItemsByWithdrawalId {
            nodes { quantity orderItemByOrderItemId { productName sizeLabel } }
          }
          invoicesByWithdrawalId(condition: { status: "issued" }) {
            nodes { id series number total }
          }
        }
      }
      invoicesByOrderId(orderBy: CREATED_AT_ASC) {
        nodes { id kind status series number issueDate total }
      }
    }
  }
`;

// Cererile de retur ale comenzii: ce returnează clientul și ce ai de făcut
function WithdrawalsSection({ withdrawals, deadline }: { withdrawals: Withdrawal[]; deadline: string | null }) {
    const waiting = withdrawals.some((w) => w.status === "received");

    return (
        <section className={`rounded-xl border bg-white p-6 ${waiting ? "border-amber-400" : ""}`}>
            <h2 className="font-semibold">Retur</h2>
            {deadline && <p className="mt-1 text-xs text-neutral-500">Termen: {formatDeadline(deadline)}</p>}

            <div className="mt-4 space-y-6">
                {withdrawals.map((withdrawal) => (
                    <article key={withdrawal.id} className="space-y-3 border-t pt-4 text-sm first:border-t-0 first:pt-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">Cerere din {formatRequestTime(withdrawal.createdAt)}</p>
                            <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    WITHDRAWAL_STATUS_STYLES[withdrawal.status] ?? "bg-neutral-100 text-neutral-700"
                                }`}
                            >
                                {withdrawalStatusLabel(withdrawal.status)}
                            </span>
                        </div>

                        <ul className="list-disc pl-5">
                            {withdrawal.withdrawalItemsByWithdrawalId.nodes.map((item, index) => (
                                <li key={index}>
                                    {item.quantity} × {item.orderItemByOrderItemId?.productName}{" "}
                                    <span className="text-neutral-500">({item.orderItemByOrderItemId?.sizeLabel})</span>
                                </li>
                            ))}
                        </ul>

                        {withdrawal.invoicesByWithdrawalId.nodes.map((storno) => (
                            <p key={storno.id} className="rounded-lg bg-olive-light px-3 py-2">
                                Stornarea{" "}
                                <Link href={`/admin/facturi/${storno.id}`} className="font-medium text-olive hover:underline">
                                    {invoiceNumber(storno)}
                                </Link>{" "}
                                a fost emisă și trimisă clientului. De returnat:{" "}
                                <strong>{formatMoney(Math.abs(Number(storno.total)))} lei</strong>.
                            </p>
                        ))}

                        <dl className="grid gap-1 text-neutral-700 sm:grid-cols-[120px_1fr]">
                            <dt className="text-neutral-500">Confirmare la</dt>
                            <dd className="break-all">{withdrawal.email}</dd>
                            {withdrawal.reason && (
                                <>
                                    <dt className="text-neutral-500">Motiv</dt>
                                    <dd className="whitespace-pre-line">{withdrawal.reason}</dd>
                                </>
                            )}
                            {withdrawal.iban && (
                                <>
                                    <dt className="text-neutral-500">IBAN</dt>
                                    <dd className="font-mono">{formatIban(withdrawal.iban)}</dd>
                                </>
                            )}
                        </dl>

                        <details className="rounded-lg bg-neutral-50 px-3 py-2">
                            <summary className="cursor-pointer text-neutral-600">Declarația clientului</summary>
                            <p className="mt-2 text-neutral-700">{withdrawal.statement}</p>
                        </details>

                        <ReturnActions id={withdrawal.id} status={withdrawal.status} adminNote={withdrawal.adminNote} />
                    </article>
                ))}
            </div>
        </section>
    );
}

// Factura comenzii: ce e emis, ce așteaptă confirmarea ta și butonul pentru o ciornă nouă
function InvoicesSection({
    orderId,
    invoices,
    canInvoice,
}: {
    orderId: string;
    invoices: OrderInvoice[];
    canInvoice: boolean;
}) {
    const waiting = invoices.some((invoice) => invoice.status === "draft");

    return (
        <section className={`rounded-xl border bg-white p-6 text-sm ${waiting ? "border-amber-400" : ""}`}>
            <h2 className="font-semibold">Factură</h2>
            {invoices.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {invoices.map((invoice) => (
                        <li key={invoice.id} className="flex items-baseline justify-between gap-3">
                            <Link href={`/admin/facturi/${invoice.id}`} className="text-olive hover:underline">
                                {invoice.status === "draft"
                                    ? `${invoiceKindLabel(invoice.kind)}: ciornă de emis`
                                    : `${invoiceKindLabel(invoice.kind)} ${invoiceNumber(invoice)} din ${formatInvoiceDate(invoice.issueDate)}`}
                            </Link>
                            <span className="flex items-baseline gap-3 whitespace-nowrap">
                                <span className="tabular-nums">{formatMoney(invoice.total)} lei</span>
                                {/* PDF-ul arhivat, același pe care l-a primit clientul (migrația 030) */}
                                {invoice.status === "issued" && (
                                    <a
                                        href={invoicePdfHref(invoice.id)}
                                        target="_blank"
                                        rel="noopener"
                                        className="font-medium text-olive hover:underline"
                                    >
                                        PDF
                                    </a>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {invoices.length === 0 && !canInvoice && (
                <p className="mt-2 text-neutral-500">Factura se face după ce confirmi comanda.</p>
            )}
            {canInvoice && (
                <div className="mt-3">
                    <CreateInvoiceButton orderId={orderId} />
                </div>
            )}
        </section>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <dt className="text-neutral-600">{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

async function OrderDetails({ params }: { params: Promise<{ numar: string }> }) {
    const { token } = await requireAdmin();
    const { numar } = await params;

    // Ce vine din adresă trebuie să fie chiar un număr; altfel nici nu mai întrebăm API-ul
    if (!/^\d{1,9}$/.test(numar)) notFound();

    const data = await gql<{ orderByOrderNumber: AdminOrder | null }>(
        query,
        { number: Number(numar) },
        token,
    );
    const order = data.orderByOrderNumber;
    if (!order) notFound();

    const items = order.orderItemsByOrderId.nodes;
    const history = order.orderStatusHistoriesByOrderId.nodes;
    const method = order.deliveryMethodByDeliveryMethodId;
    const withdrawals = order.withdrawalsByOrderId.nodes;

    // Factura emisă care încă n-a fost stornată de tot: la anulare se stornează automat
    const issued = order.invoicesByOrderId.nodes.filter((invoice) => invoice.status === "issued");
    const balance = issued.reduce((sum, invoice) => sum + Math.round(Number(invoice.total) * 100), 0);
    const lastInvoice = issued.filter((invoice) => invoice.kind === "invoice").at(-1);
    const activeInvoice = balance !== 0 && lastInvoice ? invoiceNumber(lastInvoice) : null;

    return (
        <>
            <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-olive">Comanda #{order.orderNumber}</h1>
                <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-neutral-500">Plasată pe {formatOrderDate(order.createdAt)}</p>

            {/* Nota clientului iese în evidență: poate cere ceva important */}
            {order.customerNote && (
                <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
                    <p className="font-semibold text-amber-800">Nota clientului</p>
                    <p className="mt-1 whitespace-pre-line text-neutral-800">{order.customerNote}</p>
                </div>
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
                <div className="space-y-6">
                    <section className="rounded-xl border bg-white p-6">
                        <h2 className="font-semibold">Produse</h2>
                        <ul className="mt-3 divide-y">
                            {items.map((item) => (
                                <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                                    <span>
                                        {item.quantity} × {item.productName}{" "}
                                        <span className="text-neutral-500">({item.sizeLabel})</span>
                                        <span className="block text-xs text-neutral-500">
                                            {formatPrice(item.unitPrice)} / buc.
                                        </span>
                                    </span>
                                    <span className="whitespace-nowrap font-medium">{formatPrice(item.lineTotal)}</span>
                                </li>
                            ))}
                        </ul>
                        <dl className="mt-3 space-y-2 border-t pt-4 text-sm">
                            <Row label="Produse" value={formatPrice(order.subtotal)} />
                            {Number(order.discountTotal) > 0 && (
                                <Row label="Reducere" value={`− ${formatPrice(order.discountTotal)}`} />
                            )}
                            <Row
                                label="Livrare"
                                value={Number(order.shippingTotal) === 0 ? "Gratuit" : formatPrice(order.shippingTotal)}
                            />
                            {Number(order.paymentFee) > 0 && (
                                <Row label="Taxă plată" value={formatPrice(order.paymentFee)} />
                            )}
                            <div className="flex justify-between border-t pt-3 text-lg font-bold">
                                <dt>Total</dt>
                                <dd>{formatPrice(order.total)}</dd>
                            </div>
                        </dl>
                    </section>

                    {withdrawals.length > 0 && (
                        <WithdrawalsSection withdrawals={withdrawals} deadline={order.withdrawalDeadline} />
                    )}

                    <section className="rounded-xl border bg-white p-6">
                        <h2 className="font-semibold">Istoric</h2>
                        {/* Rândurile scrise de trigger-ul log_status_change, în ordinea în care s-au întâmplat */}
                        <ol className="mt-4 space-y-3 border-l-2 border-olive/30 pl-4 text-sm">
                            {history.map((entry) => (
                                <li key={entry.id} className="relative">
                                    <span className="absolute -left-[23px] top-1.5 size-3 rounded-full border-2 border-white bg-olive" />
                                    <span className="font-medium">{statusLabel(entry.status)}</span>
                                    <span className="ml-2 text-neutral-500">{formatOrderDate(entry.createdAt)}</span>
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="rounded-xl border bg-white p-6 text-sm">
                        <h2 className="font-semibold">Ce urmează</h2>
                        <div className="mt-3">
                            <OrderActions
                                orderId={order.id}
                                orderNumber={order.orderNumber}
                                status={order.status}
                                paymentStatus={order.paymentStatus}
                                needsAddress={method?.needsAddress ?? true}
                                needsAwb={method?.needsAwb ?? false}
                                cancelReason={order.cancelReason}
                                cancelledBy={order.cancelledBy}
                                cancelledAt={order.cancelledAt}
                                cancelDetails={order.cancelDetails}
                                invoiceLabel={activeInvoice}
                            />
                        </div>
                    </section>

                    <InvoicesSection
                        orderId={order.id}
                        invoices={order.invoicesByOrderId.nodes}
                        canInvoice={order.canInvoice}
                    />

                    <aside className="h-fit space-y-5 rounded-xl border bg-white p-6 text-sm">
                        <div>
                            <h2 className="font-semibold">Client</h2>
                            <p className="mt-1">{order.customerName}</p>
                            <p>
                                <a href={`tel:${order.phone}`} className="text-olive hover:underline">
                                    {order.phone}
                                </a>
                            </p>
                            <p>
                                <a href={`mailto:${order.email}`} className="break-all text-olive hover:underline">
                                    {order.email}
                                </a>
                            </p>
                        </div>

                        <div>
                            <h2 className="font-semibold">Livrare</h2>
                            <p className="mt-1">{order.deliveryName}</p>
                            {order.address && (
                                <p className="mt-1 text-neutral-600">
                                    {order.address}
                                    <br />
                                    {order.city}, jud. {order.county}
                                    {order.postalCode ? `, ${order.postalCode}` : ""}
                                </p>
                            )}
                            {(order.courier || order.awb) && (
                                <p className="mt-2 text-neutral-600">
                                    {order.courier}
                                    {order.awb && (
                                        <>
                                            {" "}
                                            · AWB <span className="font-mono">{order.awb}</span>
                                        </>
                                    )}
                                </p>
                            )}
                        </div>

                        <div>
                            <h2 className="font-semibold">Plată</h2>
                            <p className="mt-1">{order.paymentName}</p>
                            <p
                                className={`capitalize ${
                                    order.paymentStatus === "paid" ? "text-green-700" : "text-neutral-500"
                                }`}
                            >
                                {paymentLabel(order.paymentStatus)}
                            </p>
                        </div>

                        {order.companyName && (
                            <div>
                                <h2 className="font-semibold">Factură pe firmă</h2>
                                <p className="mt-1 text-neutral-600">
                                    {order.companyName}
                                    <br />
                                    CUI {order.companyCui}
                                    {order.companyRegNo && (
                                        <>
                                            <br />
                                            Nr. Reg. Com. {order.companyRegNo}
                                        </>
                                    )}
                                    {order.companyAddress && (
                                        <>
                                            <br />
                                            {order.companyAddress}
                                        </>
                                    )}
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}

export default function AdminOrderPage({ params }: { params: Promise<{ numar: string }> }) {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/admin/comenzi" className="text-sm text-olive hover:underline">
                ← Toate comenzile
            </Link>
            <Suspense fallback={<p className="mt-6">Se încarcă comanda...</p>}>
                <OrderDetails params={params} />
            </Suspense>
        </main>
    );
}