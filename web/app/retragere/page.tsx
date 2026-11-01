import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FindOrderForm } from "@/components/withdrawal/find-order-form";
import { getSession } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { formatOrderDate, statusLabel } from "@/lib/orders";
import { getShopInfo } from "@/lib/shop-info";
import { WITHDRAW_LABEL, formatDeadline } from "@/lib/withdrawals";

export const metadata: Metadata = {
    title: "Retragerea din contract · Panos Greco",
};

// Pagina din subsol, „Retrageți-vă din contract aici”: de aici clientul își alege comanda.
// Cu cont: îi arătăm comenzile din care se mai poate retrage. Fără cont: număr + email.

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
  query MyOrdersForWithdrawal {
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
                    Nu ai comenzi din care să te mai poți retrage. Dacă ai comandat fără cont sau cu alt email,
                    folosește formularul de mai jos.
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
                                        ? `Te poți retrage până pe ${formatDeadline(order.withdrawalDeadline)}.`
                                        : "Nu ai primit-o încă: te poți retrage oricând până la livrare și încă 14 zile după."}
                                </p>
                            </div>
                            <Link href={`/retragere/${order.id}`} className={buttonVariants({ variant: "outline" })}>
                                {WITHDRAW_LABEL}
                            </Link>
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
            Poți trimite cererea și pe email, la{" "}
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

export default function WithdrawalStartPage() {
    return (
        <main className="mx-auto w-full max-w-3xl space-y-6 px-8 py-10">
            <div>
                <h1 className="text-3xl font-bold text-olive">Retragerea din contract</h1>
                <p className="mt-3 text-neutral-700">
                    Ai dreptul să te retragi din contract în 14 zile de la primirea produselor, fără să ne spui motivul.
                    Până la livrare te poți retrage oricând. Alege comanda, confirmă produsele și primești imediat pe
                    email confirmarea cererii.
                </p>
            </div>

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
        </main>
    );
}
