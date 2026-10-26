import { Suspense } from "react";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

const sections = [
    { href: "/admin/produse", title: "Produse", text: "Detalii, prețuri și stoc." },
    { href: "/admin/categorii", title: "Categorii", text: "Adaugă, redenumește, ordonează." },
];

async function AdminDashboard() {
    const { user } = await requireAdmin();

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
                <div className="rounded-xl border border-dashed bg-white/50 p-6">
                    <h2 className="text-lg font-semibold text-neutral-400">Comenzi</h2>
                    <p className="mt-1 text-sm text-neutral-400">În curând.</p>
                </div>
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