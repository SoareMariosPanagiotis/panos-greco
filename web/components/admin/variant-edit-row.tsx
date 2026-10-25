"use client";

import { useActionState } from "react";
import { updateVariant, type VariantFormState } from "@/app/admin/produse/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSize } from "@/lib/catalog";

export type AdminVariant = {
    id: string;
    packSize: number;
    packUnit: string;
    price: string;
    stock: number;
    barcode: string | null;
};

const initialState: VariantFormState = { status: "idle", message: "" };

export function VariantEditRow({ variant }: { variant: AdminVariant }) {
    const [state, formAction, pending] = useActionState(updateVariant, initialState);

    return (
        <form
            action={formAction}
            className="grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[1fr_140px_120px_180px] md:items-center md:gap-4"
        >
            <input type="hidden" name="id" value={variant.id} />

            <div>
                <p className="font-medium">{formatSize(variant.packSize, variant.packUnit)}</p>
                <p className="text-xs text-neutral-500">{variant.barcode ?? "fără cod de bare"}</p>
            </div>

            <Input
                name="price"
                inputMode="decimal"
                defaultValue={state.price ?? variant.price}
                aria-label="Preț în lei"
                required
            />
            <Input
                name="stock"
                type="number"
                min={0}
                step={1}
                defaultValue={state.stock ?? variant.stock}
                aria-label="Stoc în bucăți"
                required
            />

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                    {pending ? "Se salvează..." : "Salvează"}
                </Button>
                {state.status === "saved" && !pending && (
                    <span className="text-sm text-green-700">✓ {state.message}</span>
                )}
            </div>

            {state.status === "error" && (
                <p role="alert" className="text-sm text-red-600 md:col-span-4">
                    {state.message}
                </p>
            )}
        </form>
    );
}