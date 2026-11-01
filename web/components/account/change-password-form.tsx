"use client";

import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/app/cont/security-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ChangePasswordState = { done: false, error: null };

// După trimitere, React golește singur câmpurile formularului: parolele nu rămân scrise în pagină
export function ChangePasswordForm({ email }: { email: string }) {
    const [state, formAction, pending] = useActionState(changePassword, initialState);

    return (
        <form action={formAction} className="mt-6 space-y-4 rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Schimbă parola</h2>
            {/* Emailul ascuns ajută managerul de parole să știe pentru ce cont salvează parola nouă */}
            <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

            <div className="space-y-2">
                <Label htmlFor="currentPassword">Parola actuală</Label>
                <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="password">Parola nouă</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="passwordRepeat">Repetă parola nouă</Label>
                    <Input
                        id="passwordRepeat"
                        name="passwordRepeat"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        required
                    />
                </div>
            </div>

            {state.done && (
                <p className="rounded-lg bg-olive-light px-3 py-2 text-sm text-olive">Parola a fost schimbată.</p>
            )}
            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                {pending ? "Se salvează..." : "Schimbă parola"}
            </Button>
        </form>
    );
}
