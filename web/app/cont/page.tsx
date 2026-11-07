import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { logout } from "@/app/cont/actions";
import { VerifyEmailNotice } from "@/components/account/verify-email-notice";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { requireCustomer } from "@/lib/auth";
import { formatPrice, gql } from "@/lib/catalog";
import { formatPhone, formatPlace, getMyAddresses } from "@/lib/customer";
import { parseInvoiceFiles } from "@/lib/invoices";
import { formatOrderDate, pluralRo } from "@/lib/orders";

export const metadata: Metadata = {
    title: "Contul meu · Panos Greco",
    robots: { index: false, follow: false },
};

type MyOrderRow = {
    id: string;
    orderNumber: number;
    status: string;
    createdAt: string;
    total: string;
    orderItemsByOrderId: { nodes: { quantity: number }[] };
    invoiceFiles: string | null; // facturile emise, ca JSON (migrația 030)
};

// Cerem „toate comenzile”, dar cu biletul clientului: RLS (politica orders_own)
// lasă să treacă doar comenzile lui. Filtrul îl face baza de date, nu noi.
const myOrdersQuery = `
  query MyOrders {
    allOrders(orderBy: CREATED_AT_DESC, first: 50) {
      nodes {
        id orderNumber status createdAt total
        orderItemsByOrderId { nodes { quantity } }
        invoiceFiles
      }
    }
  }
`;

// Are comanda o factură emisă? Atunci o semnalăm în listă: o descarcă de pe pagina comenzii.
function hasInvoice(order: MyOrderRow) {
    return parseInvoiceFiles(order.invoiceFiles).some((file) => file.kind === "invoice");
}

// Bucățile, ca la coș: 3 sticle de 1 L + 1 bidon de 5 L = 4 produse
function pieces(order: MyOrderRow) {
    return order.orderItemsByOrderId.nodes.reduce((sum, item) => sum + item.quantity, 0);
}

async function AccountOverview() {
    // Neconectat → pagina de intrare. Admin → administrarea.
    const { user, token } = await requireCustomer();

    // Două cereri independente: le trimitem deodată, nu una după alta
    const [data, addresses] = await Promise.all([
        gql<{ allOrders: { nodes: MyOrderRow[] } }>(myOrdersQuery, {}, token),
        getMyAddresses(token),
    ]);
    const orders = data.allOrders.nodes;
    const defaultAddress = addresses.find((address) => address.isDefault) ?? null;

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-olive sm:text-3xl">Contul meu</h1>
                    <p className="mt-1 text-neutral-600">Salut, {user.firstName ?? user.email}!</p>
                </div>
                <form action={logout}>
                    <Button type="submit" variant="outline">
                        Ieși din cont
                    </Button>
                </form>
            </div>

            {!user.emailVerifiedAt && <VerifyEmailNotice email={user.email} />}

            <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6">
                <section className="rounded-xl border bg-white p-4 sm:p-6">
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 className="text-lg font-semibold">Datele mele</h2>
                        <Link href="/cont/date" className="text-sm font-medium text-olive hover:underline">
                            Modifică
                        </Link>
                    </div>
                    <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-neutral-500">Nume</dt>
                        <dd>{user.lastName ?? "—"}</dd>
                        <dt className="text-neutral-500">Prenume</dt>
                        <dd>{user.firstName ?? "—"}</dd>
                        <dt className="text-neutral-500">Email</dt>
                        <dd className="break-all">{user.email}</dd>
                        <dt className="text-neutral-500">Telefon</dt>
                        <dd>{user.phone ? formatPhone(user.phone) : "—"}</dd>
                    </dl>
                </section>

                <section className="rounded-xl border bg-white p-4 sm:p-6">
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 className="text-lg font-semibold">Adresa de livrare</h2>
                        <Link href="/cont/adrese" className="text-sm font-medium text-olive hover:underline">
                            {addresses.length > 1 ? `Toate adresele (${addresses.length})` : "Adresele mele"}
                        </Link>
                    </div>
                    {defaultAddress ? (
                        <div className="mt-4 text-sm">
                            <p className="font-medium">{defaultAddress.address}</p>
                            <p className="mt-1 text-neutral-600">{formatPlace(defaultAddress)}</p>
                            <p className="mt-3 text-xs text-neutral-500">Se completează singură la comandă.</p>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-neutral-600">
                            Nu ai nicio adresă salvată.{" "}
                            <Link href="/cont/adrese/noua" className="font-medium text-olive hover:underline">
                                Adaugă una
                            </Link>
                        </p>
                    )}
                </section>
            </div>

            <section className="mt-4 rounded-xl border bg-white p-4 sm:mt-6 sm:p-6">
                <h2 className="text-lg font-semibold">Comenzile mele</h2>
                {orders.length === 0 ? (
                    <p className="mt-4 text-sm text-neutral-600">
                        Încă nu ai comenzi plasate din acest cont.{" "}
                        <Link href="/" className="font-medium text-olive hover:underline">
                            Vezi produsele
                        </Link>
                    </p>
                ) : (
                    <ul className="mt-2 divide-y">
                        {orders.map((order) => (
                            <li key={order.id}>
                                <Link
                                    href={`/cont/comenzi/${order.orderNumber}`}
                                    // Stânga: comanda; dreapta: starea și prețul, iar săgeata la capăt.
                                    // Pe telefon starea stă deasupra prețului (flex-col), ca rândul să nu se rupă.
                                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-4 transition hover:bg-olive-light sm:gap-6"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">Comanda #{order.orderNumber}</p>
                                        <p className="text-sm text-neutral-500">
                                            {formatOrderDate(order.createdAt)} ·{" "}
                                            {pluralRo(pieces(order), "produs", "produse")}
                                            {hasInvoice(order) && (
                                                <span className="whitespace-nowrap">
                                                    {" · "}
                                                    <FileText className="inline size-3.5 align-[-2px]" aria-hidden />{" "}
                                                    factură PDF
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                                        <OrderStatusBadge status={order.status} />
                                        <span className="font-semibold whitespace-nowrap">{formatPrice(order.total)}</span>
                                    </div>
                                    <ChevronRight className="size-4 shrink-0 text-neutral-400" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <Link href="/" className="mt-6 inline-block text-sm text-olive hover:underline">
                ← Înapoi la produse
            </Link>
        </>
    );
}

export default function AccountPage() {
    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
            <Suspense fallback={<p>Se încarcă contul...</p>}>
                <AccountOverview />
            </Suspense>
        </main>
    );
}
