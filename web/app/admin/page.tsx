import { Suspense } from "react";
import { logout } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

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
            <div className="mt-8 rounded-xl border bg-white p-6 text-neutral-600">
                Aici vor apărea produsele și comenzile.
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