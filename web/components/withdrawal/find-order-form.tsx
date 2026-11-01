"use client";

import { useActionState } from "react";
import { findOrderForWithdrawal, type FindOrderState } from "@/app/retragere/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FindOrderState = { orderNumber: "", email: "", error: null };

// Pentru comenzile fără cont: numărul comenzii + emailul folosit la comandă
export function FindOrderForm() {
    const [state, formAction, pending] = useActionState(findOrderForWithdrawal, initialState);

    return (
        <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <div className="space-y-2">
                    <Label htmlFor="orderNumber">Numărul comenzii</Label>
                    <Input
                        id="orderNumber"
                        name="orderNumber"
                        inputMode="numeric"
                        placeholder="ex: 1004"
                        defaultValue={state.orderNumber}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="findEmail">Emailul folosit la comandă</Label>
                    <Input
                        id="findEmail"
                        name="email"
                        type="email"
                        autoComplete="email"
                        defaultValue={state.email}
                        required
                    />
                </div>
            </div>

            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                {pending ? "Se caută..." : "Găsește comanda"}
            </Button>
        </form>
    );
}
