import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FindOrderForm } from "@/components/returns/find-order-form";
import { ReturnButton } from "@/components/returns/return-button";
import { ReturnSteps } from "@/components/returns/return-steps";
import { getSession } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { formatOrderDate, statusLabel } from "@/lib/orders";
import { getShopInfo } from "@/lib/shop-info";
import { formatDeadline } from "@/lib/withdrawals";

export const metadata: Metadata = {
    title: "Formular de retur · Panos Greco",
    description: "Returnează produsele în 14 zile de la primire, fără să ne spui de ce.",
};

// Formularul de retur: aici duce linkul „Formular de retur” din subsol. De aici clientul își alege comanda.
// Cu cont: îi arătăm comenzile pe care le mai poate returna. Fără cont: numărul comenzii + emailul.

type MyOrder = {
    id: string;
    orderNumber: number;
    status: string;
    createdAt: string;
    canWithdraw: boolean; // câmpuri calculate în baza de date (migrația 024)
    withdrawalDeadline: string | null;
};

// RLS îi dă clientului doar comenzile lui
const myOrdersQuery = `
  query MyOrdersForReturn {
    allOrders(orderBy: CREATED_AT_DESC, first: 20) {
      nodes { id orderNumber status createdAt canWithdraw withdrawalDeadline }
    }
  }
`;

async function MyOrders() {
    const session = await getSession();
    if (!session || session.user.role !== "client") return null;

    const data = await gql<{ allOrders: { nodes: MyOrder[] } }>(myOrdersQuery, {}, session.token).catch(() => null);
    const orders = (data?.allOrders.nodes ?? []).filter((order) => order.canWithdraw);

    return (
        <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Comenzile tale</h2>
            {orders.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-600">
                    Nu ai comenzi pe care să le mai poți returna. Dacă ai comandat fără cont sau cu alt email, caută
                    comanda mai jos.
                </p>
            ) : (
                <ul className="mt-3 divide-y">
                    {orders.map((order) => (
                        <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                            <div>
                                <p className="font-medium">
                                    Comanda #{order.orderNumber}{" "}
                                    <span className="font-normal text-neutral-500">
                                        din {formatOrderDate(order.createdAt)} · {statusLabel(order.status)}
                                    </span>
                                </p>
                                <p className="text-neutral-600">
                                    {order.withdrawalDeadline
                                        ? `Poți returna produsele până pe ${formatDeadline(order.withdrawalDeadline)}.`
                                        : "Nu ai primit-o încă: poți renunța oricând până la livrare și încă 14 zile după."}
                                </p>
                            </div>
                            <ReturnButton orderId={order.id} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

async function OtherWays() {
    const shop = await getShopInfo();
    return (
        <p className="text-sm text-neutral-600">
            Poți cere returul și pe email, la{" "}
            <a href={`mailto:${shop.email}`} className="text-olive underline">
                {shop.email}
            </a>
            , sau prin poștă, cu modelul de formular din{" "}
            <Link href="/retur" className="text-olive underline">
                Politica de retur
            </Link>
            . Orice cale alegi, cererea e la fel de valabilă.
        </p>
    );
}

export default function ReturnFormStartPage() {
    return (
        <main className="mx-auto w-full max-w-5xl space-y-8 px-8 py-10">
            <div className="max-w-3xl">
                <h1 className="text-3xl font-bold text-olive">Formular de retur</h1>
                <p className="mt-3 text-neutral-700">
                    Ai 14 zile de la primire să returnezi produsele, fără să ne spui de ce. Până la livrare poți renunța
                    oricând. Alegi comanda, bifezi produsele și primești imediat pe email confirmarea cererii.
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                    Returul în 14 zile este dreptul de retragere din contract (OUG 34/2014); formularul de aici e
                    declarația ta de retragere.
                </p>
            </div>

            <ReturnSteps />

            <div className="max-w-3xl space-y-6">
                <Suspense fallback={null}>
                    <MyOrders />
                </Suspense>

                <section className="rounded-xl border bg-white p-6">
                    <h2 className="text-lg font-semibold">Găsește comanda</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                        Pentru comenzile plasate fără cont: numărul comenzii îl găsești în mailul de confirmare.
                    </p>
                    <div className="mt-4">
                        <FindOrderForm />
                    </div>
                </section>

                <Suspense fallback={null}>
                    <OtherWays />
                </Suspense>
            </div>
        </main>
    );
}
