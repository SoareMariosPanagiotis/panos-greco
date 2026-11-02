import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelOrder } from "@/components/orders/cancel-order";
import { ReturnForm } from "@/components/returns/return-form";
import { gql } from "@/lib/catalog";
import { getShopInfo } from "@/lib/shop-info";
import {
    RETURN_FORM_PATH,
    formatDeadline,
    formatRequestTime,
    parseJson,
    withdrawalStatusLabel,
    type WithdrawalFormData,
    type WithdrawalRequestSummary,
} from "@/lib/withdrawals";

export const metadata: Metadata = {
    title: "Formular de retur · Panos Greco",
    robots: { index: false, follow: false },
    // Id-ul comenzii stă în adresa paginii: nu-l trimitem mai departe când clientul dă click pe alt site
    referrer: "no-referrer",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Funcția sales.withdrawal_form (migrația 024) întoarce tot ce trebuie, ca JSON
const query = `query WithdrawalForm($id: UUID!) { withdrawalForm(orderId: $id) }`;

function Requests({ requests }: { requests: WithdrawalRequestSummary[] }) {
    if (requests.length === 0) return null;
    return (
        <ul className="mt-3 space-y-1 text-sm text-neutral-600">
            {requests.map((request) => (
                <li key={request.createdAt}>
                    Cerere de retur trimisă pe {formatRequestTime(request.createdAt)} · {withdrawalStatusLabel(request.status)}
                </li>
            ))}
        </ul>
    );
}

async function WithdrawalView({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID.test(id)) notFound();

    const [data, shop] = await Promise.all([
        gql<{ withdrawalForm: unknown }>(query, { id }).catch(() => null),
        getShopInfo(),
    ]);
    if (!data) {
        return <p className="text-red-700">Serverul nu răspunde. Reîncarcă pagina peste câteva momente.</p>;
    }

    const form = parseJson<WithdrawalFormData>(data.withdrawalForm);
    if (!form) notFound();

    // Nu se mai poate: spunem de ce, fără date personale
    if (!form.canWithdraw) {
        return (
            <div className="rounded-xl border bg-white p-6">
                <h2 className="text-lg font-semibold">Comanda #{form.orderNumber}</h2>
                <p className="mt-2 text-neutral-700">
                    {form.reason === "cancelled" && "Comanda a fost anulată, deci nu mai e nimic de returnat."}
                    {form.reason === "complete" && "Ai cerut deja returul pentru toate produsele din această comandă."}
                    {form.reason === "expired" &&
                        `Termenul de 14 zile pentru retur s-a încheiat${
                            form.deadline ? ` pe ${formatDeadline(form.deadline)}` : ""
                        }.`}
                </p>
                <Requests requests={form.requests} />
                {form.reason === "expired" && (
                    <p className="mt-4 text-sm text-neutral-600">
                        Dacă un produs are o problemă (e deteriorat sau nu e ce ai comandat), ai în continuare dreptul la
                        garanția legală de conformitate. Scrie-ne la{" "}
                        <a href={`mailto:${shop.email}`} className="text-olive underline">
                            {shop.email}
                        </a>
                        .
                    </p>
                )}
            </div>
        );
    }

    const placed = new Date(form.createdAt).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Bucharest",
    });

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-white p-6">
                <h2 className="text-lg font-semibold">
                    Comanda #{form.orderNumber} <span className="font-normal text-neutral-500">din {placed}</span>
                </h2>
                {form.canCancel ? (
                    // N-a plecat încă: cel mai simplu e anularea, cu un clic (migrația 031)
                    <>
                        <p className="mt-1 text-sm text-neutral-700">
                            Comanda n-a plecat încă spre tine, așa că o poți anula direct. Anularea e imediată și
                            primești confirmarea pe email.
                        </p>
                        <CancelOrder orderId={form.orderId} className="mt-3 text-sm" />
                    </>
                ) : (
                    <p className="mt-1 text-sm text-neutral-700">
                        {form.deadline
                            ? `Poți returna produsele până pe ${formatDeadline(form.deadline)}, fără să ne spui motivul.`
                            : `Comanda a plecat deja spre tine. Cel mai simplu e s-o refuzi la livrare${
                                  form.paidOnDelivery ? ": plata e la livrare, deci nu plătești nimic" : ""
                              }. Dacă o primești, ai 14 zile s-o returnezi. Ne poți anunța și de acum, cu formularul de mai jos.`}
                    </p>
                )}
                <Requests requests={form.requests} />
            </div>

            {form.canCancel && (
                <p className="text-sm text-neutral-600">
                    Vrei să renunți doar la unele produse? Completează formularul de mai jos.
                </p>
            )}

            <ReturnForm data={form} returnAddress={shop.shopAddress} />
        </div>
    );
}

export default function WithdrawalPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <main className="mx-auto w-full max-w-3xl space-y-6 px-8 py-10">
            <div>
                <Link href={RETURN_FORM_PATH} className="text-sm text-olive hover:underline">
                    ← Altă comandă
                </Link>
                <h1 className="mt-2 text-3xl font-bold text-olive">Formular de retur</h1>
            </div>
            <Suspense fallback={<p>Se încarcă comanda...</p>}>
                <WithdrawalView params={params} />
            </Suspense>
        </main>
    );
}
