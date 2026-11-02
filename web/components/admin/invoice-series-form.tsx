"use client";

import { useActionState } from "react";
import { updateInvoiceSeries, type InvoiceActionState } from "@/app/admin/facturi/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: InvoiceActionState = { status: "idle", message: "" };

type Props = {
    code: string;
    nextNumber: number;
    used: boolean; // seria are deja facturi emise
};

export function InvoiceSeriesForm({ code, nextNumber, used }: Props) {
    const [state, formAction, pending] = useActionState(updateInvoiceSeries, initialState);

    return (
        <form action={formAction} className="space-y-5 rounded-xl border bg-white p-6">
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="code">{used ? "Codul seriei noi" : "Codul seriei"}</Label>
                    <Input
                        id="code"
                        name="code"
                        defaultValue={used ? "" : code}
                        placeholder={used ? "ex: PGW26" : "PGW"}
                        maxLength={10}
                        className="uppercase"
                        required
                    />
                    <p className="text-xs text-neutral-500">Litere și cifre, fără spații, începe cu o literă.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="nextNumber">{used ? "Primul număr din seria nouă" : "Primul număr"}</Label>
                    <Input
                        id="nextNumber"
                        name="nextNumber"
                        type="number"
                        min={1}
                        step={1}
                        defaultValue={used ? 1 : nextNumber}
                        required
                    />
                </div>
            </div>

            {state.status === "error" && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.message}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={pending} className="bg-olive text-white hover:bg-olive/90">
                    {pending ? "Se salvează..." : used ? "Treci la seria nouă" : "Salvează seria"}
                </Button>
                {state.status === "saved" && !pending && <span className="text-sm text-green-700">✓ {state.message}</span>}
            </div>
        </form>
    );
}
