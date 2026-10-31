"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createAccount, type CreateAccountState } from "@/app/cont/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateAccountState = {
    error: null,
    values: { fullName: "", email: "", acceptTerms: false },
};

export function RegisterForm() {
    const [state, formAction, pending] = useActionState(createAccount, initialState);
    const { values } = state;

    return (
        <form action={formAction} className="space-y-4">
            {/* Capcană pentru roboți: oamenii nu văd câmpul, roboții îl completează */}
            <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
            />

            <div className="space-y-2">
                <Label htmlFor="fullName">Nume și prenume</Label>
                <Input
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    defaultValue={values.fullName}
                    minLength={2}
                    maxLength={100}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={values.email}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Parolă</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    aria-describedby="password-hint"
                    required
                />
                <p id="password-hint" className="text-xs text-neutral-500">
                    Cel puțin 8 caractere.
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="passwordRepeat">Repetă parola</Label>
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

            <label className="flex items-start gap-2 text-sm">
                <input
                    type="checkbox"
                    name="acceptTerms"
                    defaultChecked={values.acceptTerms}
                    required
                    className="mt-0.5 size-4 accent-olive"
                />
                <span>
                    Am citit și accept{" "}
                    <Link href="/termeni" className="text-olive underline">
                        termenii și condițiile
                    </Link>{" "}
                    și{" "}
                    <Link href="/confidentialitate" className="text-olive underline">
                        politica de confidențialitate
                    </Link>
                    .
                </span>
            </label>

            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <Button type="submit" disabled={pending} className="w-full bg-olive hover:bg-olive/90">
                {pending ? "Se creează contul..." : "Creează cont"}
            </Button>
        </form>
    );
}