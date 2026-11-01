import Link from "next/link";
import { CircleCheck, CircleX, PackageCheck, Store, Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/catalog";
import { formatOrderDate, statusLabel } from "@/lib/orders";
import { WITHDRAW_LABEL, formatDeadline, formatRequestTime, withdrawalStatusLabel } from "@/lib/withdrawals";

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
    subtotal: string;
    discountTotal: string;
    shippingTotal: string;
    paymentFee: string;
    total: string;
    createdAt: string;
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
  companyName companyCui companyAddress paymentName
  subtotal discountTotal shippingTotal paymentFee total createdAt
`;
export const ORDER_VIEW_ITEM_FIELDS = `id productName sizeLabel unitPrice quantity lineTotal`;

// Retragerea din contract (migrația 024): canWithdraw și withdrawalDeadline sunt câmpuri
// calculate de baza de date pentru fiecare comandă
export const ORDER_WITHDRAWAL_FIELDS = `id canWithdraw withdrawalDeadline`;

export type OrderWithdrawalInfo = {
    orderId: string;
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
                text: "Dacă ai întrebări, răspunde la mailul primit de la noi sau scrie-ne la office@panos-greco.com.",
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

// Butonul cerut de lege, cât timp clientul se mai poate retrage, plus cererile trimise deja
function WithdrawalBox({ info }: { info: OrderWithdrawalInfo }) {
    const requests = info.requests ?? [];
    if (!info.canWithdraw && requests.length === 0) return null;

    return (
        <section className="rounded-xl border bg-white p-6 text-sm">
            <h2 className="font-semibold">Retragerea din contract</h2>
            {requests.length > 0 && (
                <ul className="mt-3 space-y-1 text-neutral-700">
                    {requests.map((request) => (
                        <li key={request.id}>
                            Cerere trimisă pe {formatRequestTime(request.createdAt)} ·{" "}
                            <span className="font-medium">{withdrawalStatusLabel(request.status)}</span>
                        </li>
                    ))}
                </ul>
            )}
            {info.canWithdraw && (
                <>
                    <p className="mt-2 text-neutral-600">
                        {info.deadline
                            ? `Te poți retrage din contract până pe ${formatDeadline(info.deadline)}, fără să ne spui motivul.`
                            : "Te poți retrage din contract oricând până la livrare și încă 14 zile după, fără să ne spui motivul."}
                    </p>
                    <Link
                        href={`/retragere/${info.orderId}`}
                        className={buttonVariants({ variant: "outline", className: "mt-3" })}
                    >
                        {WITHDRAW_LABEL}
                    </Link>
                </>
            )}
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
    withdrawal?: OrderWithdrawalInfo; // butonul „Retrageți-vă din contract aici”
};

export function OrderView({ order, items, place, history, withdrawal }: OrderViewProps) {
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

                    {withdrawal && <WithdrawalBox info={withdrawal} />}

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
