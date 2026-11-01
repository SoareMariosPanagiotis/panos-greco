"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmEmail, type ConfirmState } from "@/app/cont/security-actions";
import { Button } from "@/components/ui/button";
import { pluralRo } from "@/lib/orders";

const initialState: ConfirmState = { done: false, linkedOrders: 0, error: null };

// Confirmarea are nevoie de un click: unele programe antivirus deschid singure linkurile
// din mailuri, iar o simplă deschidere a paginii nu trebuie să schimbe nimic.
export function ConfirmEmailForm({ token }: { token: string }) {
    const [state, formAction, pending] = useActionState(confirmEmail, initialState);

    if (state.done) {
        const moved = state.linkedOrders;
        return (
            <div className="space-y-4 text-sm">
                <p className="rounded-lg bg-olive-light px-3 py-2 text-olive">Gata! Adresa ta de email e confirmată.</p>
                {moved > 0 && (
                    <p className="text-neutral-700">
                        {moved === 1
                            ? "Am mutat în contul tău o comandă plasată fără cont cu această adresă."
                            : `Am mutat în contul tău ${pluralRo(moved, "comandă", "comenzi")} plasate fără cont cu această adresă.`}
                    </p>
                )}
                <Link
                    href="/cont"
                    className="inline-flex h-9 items-center rounded-lg bg-olive px-4 font-medium text-white hover:bg-olive/90"
                >
                    Mergi la contul meu
                </Link>
            </div>
        );
    }

    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}
            <Button type="submit" disabled={pending} className="w-full bg-olive hover:bg-olive/90">
                {pending ? "Se confirmă..." : "Confirmă adresa de email"}
            </Button>
        </form>
    );
}
