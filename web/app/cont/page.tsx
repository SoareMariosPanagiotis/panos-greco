import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/cont/actions";
import { Button } from "@/components/ui/button";
import { firstName, requireCustomer } from "@/lib/auth";

export const metadata: Metadata = {
    title: "Contul meu · Panos Greco",
    robots: { index: false, follow: false },
};

async function AccountOverview() {
    // Neconectat → pagina de intrare. Admin → administrarea.
    const { user } = await requireCustomer();

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-olive">Contul meu</h1>
                    <p className="mt-1 text-neutral-600">Salut, {firstName(user) ?? user.email}!</p>
                </div>
                <form action={logout}>
                    <Button type="submit" variant="outline">
                        Ieși din cont
                    </Button>
                </form>
            </div>

            <section className="mt-8 rounded-xl border bg-white p-6">
                <h2 className="text-lg font-semibold">Datele mele</h2>
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
                    <dt className="text-neutral-500">Nume</dt>
                    <dd>{user.fullName ?? "—"}</dd>
                    <dt className="text-neutral-500">Email</dt>
                    <dd>{user.email}</dd>
                </dl>
            </section>

            <Link href="/" className="mt-6 inline-block text-sm text-olive hover:underline">
                ← Înapoi la produse
            </Link>
        </>
    );
}

export default function AccountPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Suspense fallback={<p>Se încarcă contul...</p>}>
                <AccountOverview />
            </Suspense>
        </main>
    );
}