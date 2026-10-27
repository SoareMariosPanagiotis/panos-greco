import { Suspense } from "react";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { pluralRo } from "@/lib/orders";

const sections = [
    { href: "/admin/produse", title: "Produse", text: "Detalii, prețuri și stoc." },
    { href: "/admin/categorii", title: "Categorii", text: "Adaugă, redenumește, ordonează." },
];

// Doar numărul comenzilor noi, nu toate datele lor
const newOrdersQuery = `
  query NewOrdersCount {
    allOrders(condition: { status: "new" }) { totalCount }
  }
`;

async function AdminDashboard() {
    const { user, token } = await requireAdmin();
    const data = await gql<{ allOrders: { totalCount: number } }>(newOrdersQuery, {}, token);
    const newOrders = data.allOrders.totalCount;

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-olive">Administrare</h1>
                    <p className="mt-1 text-neutral-600">
                        Conectat ca {user.email} ({user.role})
                    </p>
                </div>
                <form action={logout}>
                    <Button type="submit" variant="outline">
                        Ieși din cont
                    </Button>
                </form>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {/* Comenzile sunt primele: aici te uiți în fiecare zi */}
                <Link
                    href={newOrders > 0 ? "/admin/comenzi?stare=new" : "/admin/comenzi"}
                    className={`rounded-xl border bg-white p-6 transition hover:border-olive hover:shadow-md ${
                        newOrders > 0 ? "border-amber-400" : ""
                    }`}
                >
                    <h2 className="text-lg font-semibold text-olive">Comenzi</h2>
                    <p className={`mt-1 text-sm ${newOrders > 0 ? "font-medium text-amber-700" : "text-neutral-600"}`}>
                        {newOrders > 0
                            ? `${pluralRo(newOrders, "comandă nouă", "comenzi noi")} te așteaptă`
                            : "Nicio comandă nouă."}
                    </p>
                </Link>

                {sections.map((section) => (
                    <Link
                        key={section.href}
                        href={section.href}
                        className="rounded-xl border bg-white p-6 transition hover:border-olive hover:shadow-md"
                    >
                        <h2 className="text-lg font-semibold text-olive">{section.title}</h2>
                        <p className="mt-1 text-sm text-neutral-600">{section.text}</p>
                    </Link>
                ))}
            </div>
        </>
    );
}

export default function AdminPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Suspense fallback={<p>Se verifică accesul...</p>}>
                <AdminDashboard />
            </Suspense>
        </main>
    );
}