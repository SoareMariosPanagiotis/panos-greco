"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotState } from "@/app/cont/security-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm({ defaultEmail }: { defaultEmail: string }) {
    const [state, formAction, pending] = useActionState(requestPasswordReset, {
        sent: false,
        email: defaultEmail,
        error: null,
    } satisfies ForgotState);

    if (state.sent) {
        return (
            <div className="space-y-4 text-sm">
                <p className="rounded-lg bg-olive-light px-3 py-2 text-olive">
                    Dacă există un cont cu adresa <strong>{state.email}</strong>, ți-am trimis un link pentru o
                    parolă nouă. Linkul e valabil o oră.
                </p>
                <p className="text-neutral-600">Nu găsești mailul? Uită-te și în dosarul Spam.</p>
                <Link href="/cont/intra" className="inline-block font-medium text-olive hover:underline">
                    ← Înapoi la intrarea în cont
                </Link>
            </div>
        );
    }

    return (
        <form action={formAction} className="space-y-4">
            {/* Capcană pentru roboți: oamenii nu văd câmpul, roboții îl completează */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={state.email}
                    autoFocus
                    required
                />
            </div>

            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <Button type="submit" disabled={pending} className="w-full bg-olive hover:bg-olive/90">
                {pending ? "Se trimite..." : "Trimite linkul"}
            </Button>
            <Link href="/cont/intra" className="block text-center text-sm text-olive hover:underline">
                ← Înapoi la intrarea în cont
            </Link>
        </form>
    );
}
