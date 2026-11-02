"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type NewPasswordState } from "@/app/cont/security-actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initialState: NewPasswordState = { error: null };

export function NewPasswordForm({ token }: { token: string }) {
    const [state, formAction, pending] = useActionState(resetPassword, initialState);
    const expired = state.error?.startsWith("Linkul") ?? false;

    return (
        <form action={formAction} className="space-y-4">
            {/* Tokenul din link merge mai departe la server, ascuns */}
            <input type="hidden" name="token" value={token} />

            <div className="space-y-2">
                <Label htmlFor="password">Parola nouă</Label>
                <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    aria-describedby="password-hint"
                    autoFocus
                    required
                />
                <p id="password-hint" className="text-xs text-neutral-500">
                    Cel puțin 8 caractere.
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="passwordRepeat">Repetă parola nouă</Label>
                <PasswordInput
                    id="passwordRepeat"
                    name="passwordRepeat"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                />
            </div>

            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                    {expired && (
                        <>
                            {" "}
                            <Link href="/cont/parola-uitata" className="font-medium underline">
                                Cere un link nou
                            </Link>
                        </>
                    )}
                </p>
            )}

            <Button type="submit" disabled={pending} className="w-full bg-olive hover:bg-olive/90">
                {pending ? "Se salvează..." : "Salvează parola nouă"}
            </Button>
        </form>
    );
}
