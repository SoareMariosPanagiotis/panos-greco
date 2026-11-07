import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { setDefaultAddress } from "@/app/cont/account-actions";
import { DeleteAddressButton } from "@/components/account/delete-address-button";
import { requireCustomer } from "@/lib/auth";
import { formatPlace, getMyAddresses, MAX_ADDRESSES } from "@/lib/customer";

export const metadata: Metadata = {
    title: "Adresele mele · Panos Greco",
    robots: { index: false, follow: false },
};

async function AddressBook() {
    const { token } = await requireCustomer();
    const addresses = await getMyAddresses(token);

    return (
        <>
            {addresses.length === 0 ? (
                <p className="mt-6 rounded-xl border bg-white p-6 text-sm text-neutral-600">
                    Nu ai încă nicio adresă salvată. Adaug-o aici sau bifează „Salvează adresa în cont” la
                    următoarea comandă.
                </p>
            ) : (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {addresses.map((address) => (
                        <li
                            key={address.id}
                            className={`rounded-xl border bg-white p-5 ${address.isDefault ? "border-olive" : ""}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <p className="font-medium">{address.address}</p>
                                {address.isDefault && (
                                    <span className="shrink-0 rounded-full bg-olive-light px-2.5 py-0.5 text-xs font-medium text-olive">
                                        Implicită
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-neutral-600">{formatPlace(address)}</p>

                            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                <Link
                                    href={`/cont/adrese/${address.id}`}
                                    className="font-medium text-olive hover:underline"
                                >
                                    Modifică
                                </Link>
                                {!address.isDefault && (
                                    <form action={setDefaultAddress}>
                                        <input type="hidden" name="id" value={address.id} />
                                        <button type="submit" className="text-olive hover:underline">
                                            Folosește ca implicită
                                        </button>
                                    </form>
                                )}
                                <DeleteAddressButton id={address.id} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {addresses.length < MAX_ADDRESSES ? (
                <Link
                    href="/cont/adrese/noua"
                    className="mt-6 inline-flex h-9 items-center rounded-lg bg-olive px-4 text-sm font-medium text-white hover:bg-olive/90"
                >
                    + Adaugă o adresă
                </Link>
            ) : (
                <p className="mt-6 text-sm text-neutral-600">
                    Ai salvat {MAX_ADDRESSES} adrese, cât se poate. Șterge una ca să adaugi alta.
                </p>
            )}
        </>
    );
}

export default function AddressesPage() {
    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
            <Link href="/cont" className="text-sm text-olive hover:underline">
                ← Contul meu
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Adresele mele</h1>
            <p className="mt-1 text-neutral-600">Adresa implicită se completează singură când plasezi o comandă.</p>
            <Suspense fallback={<p className="mt-6">Se încarcă...</p>}>
                <AddressBook />
            </Suspense>
        </main>
    );
}
