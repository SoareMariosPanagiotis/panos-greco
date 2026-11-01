import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AddressForm } from "@/components/account/address-form";
import { requireCustomer } from "@/lib/auth";

export const metadata: Metadata = {
    title: "Adresă nouă · Panos Greco",
    robots: { index: false, follow: false },
};

async function NewAddress() {
    // Neconectat → pagina de intrare. Admin → administrarea.
    await requireCustomer();
    return <AddressForm />;
}

export default function NewAddressPage() {
    return (
        <main className="mx-auto w-full max-w-xl px-8 py-10">
            <Link href="/cont/adrese" className="text-sm text-olive hover:underline">
                ← Adresele mele
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Adresă nouă</h1>
            <Suspense fallback={<p className="mt-6">Se încarcă...</p>}>
                <NewAddress />
            </Suspense>
        </main>
    );
}
