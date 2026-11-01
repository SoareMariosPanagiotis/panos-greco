"use client";

import { useActionState } from "react";
import { resendVerification, type ResendState } from "@/app/cont/security-actions";

const initialState: ResendState = { sent: false, error: null };

// Banda din „Contul meu” cât timp emailul nu e confirmat
export function VerifyEmailNotice({ email }: { email: string }) {
    const [state, formAction, pending] = useActionState(resendVerification, initialState);

    return (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {state.sent ? (
                <p>
                    Ți-am trimis linkul de confirmare la <strong>{email}</strong>. Nu-l găsești? Uită-te și în dosarul
                    Spam.
                </p>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <p>
                        Confirmă adresa de email, ca să apară aici și comenzile plasate fără cont cu ea.
                    </p>
                    <form action={formAction}>
                        <button
                            type="submit"
                            disabled={pending}
                            className="font-medium underline underline-offset-2 hover:no-underline disabled:opacity-60"
                        >
                            {pending ? "Se trimite..." : "Trimite linkul de confirmare"}
                        </button>
                    </form>
                </div>
            )}
            {state.error && <p className="mt-2 text-red-700">{state.error}</p>}
        </div>
    );
}
