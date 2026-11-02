import type { ReactNode } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, FileDown, PackageCheck, Store, Truck } from "lucide-react";
import { CancelOrder } from "@/components/orders/cancel-order";
import { ReturnButton } from "@/components/returns/return-button";
import { formatPrice } from "@/lib/catalog";
import { formatInvoiceDate, invoicePdfHref, type InvoiceFile } from "@/lib/invoices";
import { formatOrderDate, statusLabel } from "@/lib/orders";
import { RETURN_FORM_PATH, formatDeadline, formatRequestTime, withdrawalStatusLabel } from "@/lib/withdrawals";

// O comandă așa cum o vede clientul. Aceeași componentă, două pagini:
//   receipt → /comanda/confirmare/[id]  linkul din mail, merge și fără cont
//   account → /cont/comenzi/[numar]     din „Contul meu”, cu pașii comenzii
export type OrderPlace = "receipt" | "account";

export type OrderViewData = {
    orderNumber: number;
    status: string;
    firstName: string;
    customerName: string;
    email: string;
    phone: string;
    deliveryName: string;
    courier: string | null;
    awb: string | null;
    county: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    companyName: string | null;
    companyCui: string | null;
    companyAddress: string | null; // din migrația 020; comenzile vechi nu o au
    paymentName: string;
    paymentStatus: string; // pending = se plătește la livrare, paid = plătită
    subtotal: string;
    discountTotal: string;
    shippingTotal: string;
    paymentFee: string;
    total: string;
    createdAt: string;
    cancelledBy: string | null; // migrația 031: „customer” = a anulat-o clientul, din site
    cancelledAt: string | null;
};

export type OrderViewItem = {
    id: string;
    productName: string;
    sizeLabel: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
};

export type OrderHistoryEntry = { id: string; status: string; createdAt: string };

// Câmpurile de mai sus, scrise o singură dată pentru interogările GraphQL ale ambelor pagini
export const ORDER_VIEW_FIELDS = `
  orderNumber status firstName customerName email phone
  deliveryName courier awb county city address postalCode
  companyName companyCui companyAddress paymentName paymentStatus
  subtotal discountTotal shippingTotal paymentFee total createdAt
  cancelledBy cancelledAt
`;
export const ORDER_VIEW_ITEM_FIELDS = `id productName sizeLabel unitPrice quantity lineTotal`;

// Retragerea din contract (migrația 024) și anularea de către client (031): canWithdraw,
// withdrawalDeadline și canCancel sunt câmpuri calculate de baza de date pentru fiecare comandă
export const ORDER_WITHDRAWAL_FIELDS = `id canWithdraw withdrawalDeadline canCancel`;

// Facturile emise ale comenzii (migrația 030): câmp calculat de baza de date, ca JSON
export const ORDER_INVOICE_FIELDS = `invoiceFiles`;

export type OrderInvoicesInfo = {
    orderId: string; // id-ul lung al comenzii: „cheia” linkului de descărcare pentru clientul fără cont
    files: InvoiceFile[];
};

export type OrderWithdrawalInfo = {
    orderId: string;
    canCancel: boolean; // n-a plecat încă: clientul o poate anula din pagină
    canWithdraw: boolean;
    deadline: string | null; // null = comanda nu e livrată încă
    requests?: { id: string; createdAt: string; status: string }[]; // doar în cont
};

// Pașii din istoric, spuși pe limba clientului
const STEP_LABELS: Record<string, string> = {
    new: "Comanda a fost plasată",
    confirmed: "Comanda a fost confirmată",
    ready_for_pickup: "Te așteaptă în magazin",
    shipped: "A plecat spre tine",
    delivered: "A fost livrată",
    cancelled: "A fost anulată",
};

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

// Ce vede clientul sus, în funcție de starea comenzii
function statusHero(order: OrderViewData, place: OrderPlace) {
    const icon = "mx-auto size-12";

    switch (order.status) {
        case "confirmed":
            return {
                icon: <CircleCheck className={`${icon} text-green-700`} />,
                title: "Comanda ta e confirmată",
                text: "O pregătim acum. Te anunțăm pe email când pleacă spre tine.",
            };
        case "ready_for_pickup":
            return {
                icon: <Store className={`${icon} text-olive`} />,
                title: "Comanda te așteaptă în magazin",
                text: "O poți ridica din magazinul nostru din Galați. Te așteptăm!",
            };
        case "shipped":
            return {
                icon: <Truck className={`${icon} text-olive`} />,
                title: "Comanda ta a plecat spre tine",
                text: order.awb
                    ? `Curier: ${order.courier ?? "-"} · AWB ${order.awb}`
                    : "Ajunge în curând la adresa de livrare.",
            };
        case "delivered":
            return {
                icon: <PackageCheck className={`${icon} text-green-700`} />,
                title: "Comanda ta a fost livrată",
                text: "Îți mulțumim că ai ales Panos Greco. Poftă bună!",
            };
        case "cancelled":
            return {
                icon: <CircleX className={`${icon} text-neutral-400`} />,
                title: "Comanda a fost anulată",
                text:
                    order.cancelledBy === "customer" && order.cancelledAt
                        ? `Ai anulat-o pe ${formatOrderDate(order.cancelledAt)}. Ți-am trimis confirmarea pe email.`
                        : "Dacă ai întrebări, răspunde la mailul primit de la noi sau scrie-ne la office@panos-greco.com.",
            };
        default:
            return {
                icon: <CircleCheck className={`${icon} text-green-700`} />,
                title: `Mulțumim, ${order.firstName}!`,
                // Fără cont, linkul e singurul drum înapoi la comandă. În cont, o găsește oricând.
                text:
                    place === "receipt"
                        ? "Te contactăm în curând pentru confirmare. Păstrează linkul acestei pagini ca să urmărești comanda."
                        : "Te contactăm în curând pentru confirmare.",
            };
    }
}

// Ce poate face clientul dacă s-a răzgândit, după unde e comanda (migrația 031), ca la eMAG:
//   - n-a plecat încă: o anulează de aici, în doi pași;
//   - e pe drum: nu se mai poate anula; o refuză la livrare sau o returnează după ce o primește;
//   - a ajuns: returul, în 14 zile, cu butonul „Returnează produse”.
// Formularul de retur (funcția de retragere cerută de lege) rămâne oricând la îndemână: în subsolul
// fiecărei pagini și, mai mic, și aici. Mare îl arătăm abia după livrare, când chiar e nevoie de el.
function ChangeOfMindBox({ order, info }: { order: OrderViewData; info: OrderWithdrawalInfo }) {
    const requests = info.requests ?? [];
    const formLink = (
        <Link href={`${RETURN_FORM_PATH}/${info.orderId}`} className="font-medium text-olive hover:underline">
            formularul de retur
        </Link>
    );

    let title = "Te-ai răzgândit?";
    let body: ReactNode = null;
    if (info.canCancel) {
        body = (
            <>
                <p className="mt-2 text-neutral-600">
                    {order.address
                        ? "Poți anula comanda cât timp n-a plecat spre tine."
                        : "Poți anula comanda până o ridici din magazin."}{" "}
                    Anularea e imediată și primești confirmarea pe email.
                </p>
                <CancelOrder orderId={info.orderId} className="mt-3" />
                <p className="mt-3 text-xs text-neutral-500">Vrei să renunți doar la unele produse? Folosește {formLink}.</p>
            </>
        );
    } else if (order.status === "delivered") {
        title = "Retur";
        if (info.canWithdraw) {
            body = (
                <>
                    <p className="mt-2 text-neutral-600">
                        {info.deadline
                            ? `Poți returna produsele până pe ${formatDeadline(info.deadline)}, fără să ne spui motivul.`
                            : "Poți returna produsele în 14 zile de la primire, fără să ne spui motivul."}
                    </p>
                    <ReturnButton orderId={info.orderId} className="mt-3" />
                </>
            );
        }
    } else if (order.status === "cancelled") {
        title = "Retur";
    } else {
        // Pe drum (sau cu AWB-ul deja pus): nu se mai anulează
        body = (
            <>
                <p className="mt-2 text-neutral-600">
                    Comanda a plecat deja spre tine, așa că nu mai poate fi anulată. Ai două variante:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">
                    <li>
                        o refuzi la livrare
                        {order.paymentStatus === "paid"
                            ? ", iar noi îți returnăm banii;"
                            : ": plata e la livrare, deci nu plătești nimic;"}
                    </li>
                    <li>o primești și ne-o trimiți înapoi în 14 zile, fără să ne spui motivul.</li>
                </ul>
                {info.canWithdraw && (
                    <p className="mt-3 text-xs text-neutral-500">Dacă vrei, ne poți anunța de pe acum, din {formLink}.</p>
                )}
            </>
        );
    }

    if (!body && requests.length === 0) return null;

    return (
        <section className="rounded-xl border bg-white p-6 text-sm">
            <h2 className="font-semibold">{title}</h2>
            {requests.length > 0 && (
                <ul className="mt-3 space-y-1 text-neutral-700">
                    {requests.map((request) => (
                        <li key={request.id}>
                            Cerere de retur trimisă pe {formatRequestTime(request.createdAt)} ·{" "}
                            <span className="font-medium">{withdrawalStatusLabel(request.status)}</span>
                        </li>
                    ))}
                </ul>
            )}
            {body}
        </section>
    );
}

// Factura și, dacă e cazul, stornările, cu PDF-ul de descărcat, ca la magazinele mari.
// Linkul deschide PDF-ul arhivat la emitere, exact cel primit pe email.
function InvoicesBox({ info, status }: { info: OrderInvoicesInfo; status: string }) {
    const box = "rounded-xl border bg-white p-6 text-sm";

    // Încă nu e emisă: spunem unde o va găsi (nu și la o comandă abia plasată sau anulată)
    if (info.files.length === 0) {
        if (status === "new" || status === "cancelled") return null;
        return (
            <section className={box}>
                <h2 className="font-semibold">Factura</h2>
                <p className="mt-2 text-neutral-600">
                    O primești pe email imediat ce o emitem. Tot atunci apare aici, gata de descărcat în PDF.
                </p>
            </section>
        );
    }

    return (
        <section className={box}>
            <h2 className="font-semibold">{info.files.length > 1 ? "Facturi" : "Factura"}</h2>
            <ul className="mt-2 divide-y">
                {info.files.map((file) => (
                    <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div>
                            <p className="font-medium">
                                {file.kind === "storno" ? "Factură de stornare" : "Factură"} {file.series} {file.number}
                            </p>
                            <p className="text-neutral-500">
                                din {formatInvoiceDate(file.issueDate)} · {formatPrice(String(file.total))}
                            </p>
                        </div>
                        {/* Un link obișnuit, nu <Link>: duce la un fișier, nu la o pagină a site-ului */}
                        <a
                            href={invoicePdfHref(file.id, info.orderId)}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium text-olive hover:bg-olive/5"
                        >
                            <FileDown className="size-4" aria-hidden />
                            Descarcă PDF
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}

// Linkul de jos: din cont te întorci în cont, din mail la produse
const BACK_LINKS = {
    receipt: { href: "/", label: "Înapoi la produse" },
    account: { href: "/cont", label: "Înapoi la contul meu" },
};

type OrderViewProps = {
    order: OrderViewData;
    items: OrderViewItem[];
    place: OrderPlace;
    history?: OrderHistoryEntry[]; // pașii comenzii, doar în cont
    withdrawal?: OrderWithdrawalInfo; // anularea înainte de expediere și returul după livrare
    invoices?: OrderInvoicesInfo; // factura și stornările, în PDF
};

export function OrderView({ order, items, place, history, withdrawal, invoices }: OrderViewProps) {
    const hero = statusHero(order, place);
    const back = BACK_LINKS[place];
    const date = new Date(order.createdAt).toLocaleString("ro-RO", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Bucharest",
    });

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-white p-8 text-center">
                {hero.icon}
                <h1 className="mt-4 text-3xl font-bold text-olive">{hero.title}</h1>
                <p className="mt-2 text-neutral-700">
                    Comanda <strong>#{order.orderNumber}</strong> din {date}
                </p>
                <p className="mt-1 text-sm text-neutral-500">Stare: {statusLabel(order.status)}</p>
                <p className="mt-4 text-sm text-neutral-600">{hero.text}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_300px]">
                <div className="space-y-6">
                    <section className="rounded-xl border bg-white p-6">
                        <h2 className="font-semibold">Produse</h2>
                        <ul className="mt-3 divide-y">
                            {items.map((item) => (
                                <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                                    <span>
                                        {item.quantity} × {item.productName}{" "}
                                        <span className="text-neutral-500">({item.sizeLabel})</span>
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

                    {invoices && <InvoicesBox info={invoices} status={order.status} />}

                    {withdrawal && <ChangeOfMindBox order={order} info={withdrawal} />}

                    {/* Istoricul: rândurile scrise de trigger-ul log_status_change */}
                    {history && history.length > 0 && (
                        <section className="rounded-xl border bg-white p-6">
                            <h2 className="font-semibold">Pașii comenzii</h2>
                            <ol className="mt-4 space-y-3 border-l-2 border-olive/30 pl-4 text-sm">
                                {history.map((entry) => (
                                    <li key={entry.id} className="relative">
                                        <span className="absolute -left-[23px] top-1.5 size-3 rounded-full border-2 border-white bg-olive" />
                                        <span className="font-medium">
                                            {STEP_LABELS[entry.status] ?? statusLabel(entry.status)}
                                        </span>
                                        <span className="ml-2 text-neutral-500">{formatOrderDate(entry.createdAt)}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                </div>

                <section className="h-fit space-y-4 rounded-xl border bg-white p-6 text-sm">
                    <div>
                        <h2 className="font-semibold">Livrare</h2>
                        <p className="mt-1">{order.deliveryName}</p>
                        {order.address && (
                            <p className="mt-1 text-neutral-600">
                                {order.address}, {order.city}, jud. {order.county}
                                {order.postalCode ? `, ${order.postalCode}` : ""}
                            </p>
                        )}
                        {order.awb && (
                            <p className="mt-1 text-neutral-600">
                                {order.courier} · AWB <span className="font-mono">{order.awb}</span>
                            </p>
                        )}
                    </div>
                    <div>
                        <h2 className="font-semibold">Plată</h2>
                        <p className="mt-1">{order.paymentName}</p>
                    </div>
                    <div>
                        <h2 className="font-semibold">Contact</h2>
                        <p className="mt-1 text-neutral-600">
                            {order.customerName}
                            <br />
                            {order.email}
                            <br />
                            {order.phone}
                        </p>
                    </div>
                    {order.companyName && (
                        <div>
                            <h2 className="font-semibold">Factură pe firmă</h2>
                            <p className="mt-1 text-neutral-600">
                                {order.companyName}
                                <br />
                                CUI {order.companyCui}
                                {order.companyAddress && (
                                    <>
                                        <br />
                                        {order.companyAddress}
                                    </>
                                )}
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <div className="text-center">
                <Link href={back.href} className="font-medium text-olive hover:underline">
                    ← {back.label}
                </Link>
            </div>
        </div>
    );
}
