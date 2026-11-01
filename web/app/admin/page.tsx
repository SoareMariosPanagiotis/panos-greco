import { Suspense } from "react";
import Link from "next/link";
import { logout } from "@/app/cont/actions";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { pluralRo } from "@/lib/orders";
import { SHOP_INFO_FIELDS, missingShopInfo, type ShopInfo } from "@/lib/shop-info";

const sections = [
    { href: "/admin/produse", title: "Produse", text: "Detalii, prețuri și stoc." },
    { href: "/admin/categorii", title: "Categorii", text: "Adaugă, redenumește, ordonează." },
    { href: "/admin/livrare", title: "Livrare și plată", text: "Prețuri, livrare gratuită, metode active." },
];

// Doar numerele care te interesează: comenzi noi, cereri de retur noi și ce lipsește din datele firmei
const dashboardQuery = `
  query AdminDashboard {
    allOrders(condition: { status: "new" }) { totalCount }
    allWithdrawals(condition: { status: "received" }) { totalCount }
    shopInfoById(id: true) { ${SHOP_INFO_FIELDS} }
  }
`;

type DashboardData = {
    allOrders: { totalCount: number };
    allWithdrawals: { totalCount: number };
    shopInfoById: ShopInfo | null;
};

// Un card care te cheamă (galben) când ai ceva de făcut
function AttentionCard({ href, title, text, attention }: { href: string; title: string; text: string; attention: boolean }) {
    return (
        <Link
            href={href}
            className={`rounded-xl border bg-white p-6 transition hover:border-olive hover:shadow-md ${
                attention ? "border-amber-400" : ""
            }`}
        >
            <h2 className="text-lg font-semibold text-olive">{title}</h2>
            <p className={`mt-1 text-sm ${attention ? "font-medium text-amber-700" : "text-neutral-600"}`}>{text}</p>
        </Link>
    );
}

async function AdminDashboard() {
    const { user, token } = await requireAdmin();
    const data = await gql<DashboardData>(dashboardQuery, {}, token);
    const newOrders = data.allOrders.totalCount;
    const newWithdrawals = data.allWithdrawals.totalCount;
    const missing = data.shopInfoById ? missingShopInfo(data.shopInfoById) : ["toate datele"];

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

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Comenzile sunt primele: aici te uiți în fiecare zi */}
                <AttentionCard
                    href={newOrders > 0 ? "/admin/comenzi?stare=new" : "/admin/comenzi"}
                    title="Comenzi"
                    text={
                        newOrders > 0
                            ? `${pluralRo(newOrders, "comandă nouă", "comenzi noi")} te așteaptă`
                            : "Nicio comandă nouă."
                    }
                    attention={newOrders > 0}
                />

                <AttentionCard
                    href="/admin/retururi"
                    title="Retururi"
                    text={
                        newWithdrawals > 0
                            ? `${pluralRo(newWithdrawals, "cerere nouă de retur", "cereri noi de retur")}`
                            : "Nicio cerere nouă de retur."
                    }
                    attention={newWithdrawals > 0}
                />

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

                <AttentionCard
                    href="/admin/firma"
                    title="Datele firmei"
                    text={missing.length > 0 ? `Mai lipsesc: ${missing.join(", ")}.` : "Apar în subsol și la Contact."}
                    attention={missing.length > 0}
                />
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