"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateProfile, type ProfileState } from "@/app/cont/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ProfileState = { error: null };

type Props = {
    email: string;
    lastName: string;
    firstName: string;
    phone: string;
};

export function ProfileForm({ email, lastName, firstName, phone }: Props) {
    const [state, formAction, pending] = useActionState(updateProfile, initialState);
    // După o eroare, câmpurile păstrează ce a scris clientul, nu revin la datele vechi
    const values = state.values;

    return (
        <form action={formAction} className="mt-6 space-y-4 rounded-xl border bg-white p-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="lastName">Nume</Label>
                    <Input
                        id="lastName"
                        name="lastName"
                        autoComplete="family-name"
                        maxLength={50}
                        defaultValue={values?.lastName ?? lastName}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="firstName">Prenume</Label>
                    <Input
                        id="firstName"
                        name="firstName"
                        autoComplete="given-name"
                        maxLength={50}
                        defaultValue={values?.firstName ?? firstName}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Telefon (opțional)</Label>
                <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="0722 123 456"
                    defaultValue={values?.phone ?? phone}
                />
                <p className="text-xs text-neutral-500">Îl completăm singuri când plasezi o comandă.</p>
            </div>

            {/* Emailul nu se schimbă de aici: un email nou trebuie întâi verificat */}
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} readOnly className="bg-neutral-50 text-neutral-600" />
                <p className="text-xs text-neutral-500">
                    Pentru schimbarea emailului, scrie-ne la office@panos-greco.com.
                </p>
            </div>

            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <div className="flex items-center gap-4">
                <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                    {pending ? "Se salvează..." : "Salvează"}
                </Button>
                <Link href="/cont" className="text-sm text-olive hover:underline">
                    Renunță
                </Link>
            </div>
        </form>
    );
}
