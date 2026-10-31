"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/cont/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm() {
    const [state, formAction, pending] = useActionState(login, initialState);

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={state.email}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Parolă</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                />
            </div>

            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <Button type="submit" disabled={pending} className="w-full bg-olive hover:bg-olive/90">
                {pending ? "Se verifică..." : "Intră în cont"}
            </Button>
        </form>
    );
}