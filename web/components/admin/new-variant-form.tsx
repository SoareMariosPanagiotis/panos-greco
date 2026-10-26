"use client";

import { useActionState } from "react";
import { addVariant, type NewVariantState } from "@/app/admin/produse/actions";
import { VariantFields } from "@/components/admin/variant-fields";
import { Button } from "@/components/ui/button";

const initialState: NewVariantState = { status: "idle", message: "" };

export function NewVariantForm({ productId }: { productId: string }) {
    const [state, formAction, pending] = useActionState(addVariant, initialState);

    return (
        <form action={formAction} className="mt-4 rounded-xl border border-dashed bg-white p-4">
            <input type="hidden" name="productId" value={productId} />
            <p className="text-sm font-medium">Adaugă o mărime</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end">
                <VariantFields idPrefix="new" values={state.values} />
                <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                    {pending ? "Se adaugă..." : "Adaugă"}
                </Button>
            </div>

            {state.status === "saved" && !pending && (
                <p className="mt-3 text-sm text-green-700">✓ {state.message}</p>
            )}
            {state.status === "error" && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                    {state.message}
                </p>
            )}
        </form>
    );
}