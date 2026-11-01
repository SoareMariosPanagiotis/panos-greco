"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveAddress, type AddressState } from "@/app/cont/account-actions";
import { AddressFields } from "@/components/address-fields";
import { Button } from "@/components/ui/button";
import type { SavedAddress } from "@/lib/customer";

const initialState: AddressState = { error: null };

// Același formular pentru „adresă nouă” și „modifică adresa”: diferă doar id-ul ascuns
export function AddressForm({ address }: { address?: SavedAddress }) {
    const [state, formAction, pending] = useActionState(saveAddress, initialState);

    return (
        <form action={formAction} className="mt-6 space-y-4 rounded-xl border bg-white p-6">
            {address && <input type="hidden" name="id" value={address.id} />}

            {/* După o eroare, câmpurile păstrează ce a scris clientul */}
            <AddressFields defaults={state.values ?? address} />

            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <div className="flex items-center gap-4">
                <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                    {pending ? "Se salvează..." : "Salvează adresa"}
                </Button>
                <Link href="/cont/adrese" className="text-sm text-olive hover:underline">
                    Renunță
                </Link>
            </div>
        </form>
    );
}
