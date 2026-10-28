import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CircleX, PackageCheck, Store, Truck } from "lucide-react";
import { formatPrice, gql } from "@/lib/catalog";
import { statusLabel } from "@/lib/orders";

// Pagină privată: Google nu trebuie s-o pună în căutări
export const metadata: Metadata = {
    title: "Comanda ta · Panos Greco",
    robots: { index: false, follow: false },
};

type Receipt = {
    orderNumber: number;
    status: string;
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
    paymentName: string;
    subtotal: string;
    discountTotal: string;
    shippingTotal: string;
    paymentFee: string;
    total: string;
    createdAt: string;
};

type ReceiptItem = {
    id: string;
    productName: string;
    sizeLabel: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
};

const query = `
  query Receipt($id: UUID!) {
    orderReceipt(receiptId: $id) {
      orderNumber status customerName email phone
      deliveryName courier awb county city address postalCode
      companyName companyCui paymentName
      subtotal discountTotal shippingTotal paymentFee total createdAt
    }
    orderReceiptItems(receiptId: $id) {
      nodes { id productName sizeLabel unitPrice quantity lineTotal }
    }
  }
`;

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

// Ce vede clientul sus, în funcție de starea comenzii
function statusHero(receipt: Receipt) {
    const icon = "mx-auto size-12";

    switch (receipt.status) {
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
                text: receipt.awb
                    ? `Curier: ${receipt.courier ?? "-"} · AWB ${receipt.awb}`
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
                title: `Mulțumim, ${receipt.customerName}!`,
                text: "Te contactăm în curând pentru confirmare. Păstrează linkul acestei pagini ca să urmărești comanda.",
            };
    }
}

async function ReceiptView({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Un id invalid (nu e uuid) dă eroare în API: îl tratăm ca „comandă inexistentă”
    const data = await gql<{
        orderReceipt: Receipt | null;
        orderReceiptItems: { nodes: ReceiptItem[] };
    }>(query, { id }).catch(() => null);

    const receipt = data?.orderReceipt;
    if (!data || !receipt || !receipt.orderNumber) notFound();

    const items = data.orderReceiptItems.nodes;
    const date = new Date(receipt.createdAt).toLocaleString("ro-RO", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Bucharest",
    });

    const hero = statusHero(receipt);

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-white p-8 text-center">
                {hero.icon}
                <h1 className="mt-4 text-3xl font-bold text-olive">{hero.title}</h1>
                <p className="mt-2 text-neutral-700">
                    Comanda <strong>#{receipt.orderNumber}</strong> din {date}
                </p>
                <p className="mt-1 text-sm text-neutral-500">Stare: {statusLabel(receipt.status)}</p>
                <p className="mt-4 text-sm text-neutral-600">{hero.text}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_300px]">
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
                        <Row label="Produse" value={formatPrice(receipt.subtotal)} />
                        {Number(receipt.discountTotal) > 0 && (
                            <Row label="Reducere" value={`− ${formatPrice(receipt.discountTotal)}`} />
                        )}
                        <Row
                            label="Livrare"
                            value={Number(receipt.shippingTotal) === 0 ? "Gratuit" : formatPrice(receipt.shippingTotal)}
                        />
                        {Number(receipt.paymentFee) > 0 && (
                            <Row label="Taxă plată" value={formatPrice(receipt.paymentFee)} />
                        )}
                        <div className="flex justify-between border-t pt-3 text-lg font-bold">
                            <dt>Total</dt>
                            <dd>{formatPrice(receipt.total)}</dd>
                        </div>
                    </dl>
                </section>

                <section className="h-fit space-y-4 rounded-xl border bg-white p-6 text-sm">
                    <div>
                        <h2 className="font-semibold">Livrare</h2>
                        <p className="mt-1">{receipt.deliveryName}</p>
                        {receipt.address && (
                            <p className="mt-1 text-neutral-600">
                                {receipt.address}, {receipt.city}, jud. {receipt.county}
                                {receipt.postalCode ? `, ${receipt.postalCode}` : ""}
                            </p>
                        )}
                    </div>
                    <div>
                        <h2 className="font-semibold">Plată</h2>
                        <p className="mt-1">{receipt.paymentName}</p>
                    </div>
                    <div>
                        <h2 className="font-semibold">Contact</h2>
                        <p className="mt-1 text-neutral-600">
                            {receipt.customerName}
                            <br />
                            {receipt.email}
                            <br />
                            {receipt.phone}
                        </p>
                    </div>
                    {receipt.companyName && (
                        <div>
                            <h2 className="font-semibold">Factură pe firmă</h2>
                            <p className="mt-1 text-neutral-600">
                                {receipt.companyName}
                                <br />
                                CUI {receipt.companyCui}
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <div className="text-center">
                <Link href="/" className="font-medium text-olive hover:underline">
                    ← Înapoi la produse
                </Link>
            </div>
        </div>
    );
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