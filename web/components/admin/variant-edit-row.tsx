"use client";

import { useActionState } from "react";
import {
    deleteVariant,
    updateVariant,
    type VariantFormState,
} from "@/app/admin/produse/actions";
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

type Props = {
    variant: AdminVariant;
    productId: string;
    canDelete: boolean;
};

const initialState: VariantFormState = { status: "idle", message: "" };

export function VariantEditRow({ variant, productId, canDelete }: Props) {
    const [state, saveAction, saving] = useActionState(updateVariant, initialState);
    const [deleteState, deleteAction, deleting] = useActionState(deleteVariant, initialState);

    const error =
        state.status === "error"
            ? state.message
            : deleteState.status === "error"
                ? deleteState.message
                : null;

    return (
        <div className="border-b px-4 py-4 last:border-b-0">
            <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_110px_90px] md:items-center md:gap-4">
                {/* "contents" lasă câmpurile formularului să stea direct în grilă */}
                <form action={saveAction} className="contents">
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
                    <Button type="submit" disabled={saving} className="bg-olive hover:bg-olive/90">
                        {saving ? "Se salvează..." : "Salvează"}
                    </Button>
                </form>

                <form
                    action={deleteAction}
                    onSubmit={(event) => {
                        // O ștergere nu se poate anula, așa că cerem confirmare
                        if (!window.confirm("Ștergi această mărime?")) event.preventDefault();
                    }}
                >
                    <input type="hidden" name="id" value={variant.id} />
                    <input type="hidden" name="productId" value={productId} />
                    <Button
                        type="submit"
                        variant="outline"
                        disabled={deleting || !canDelete}
                        title={canDelete ? "Șterge mărimea" : "Produsul trebuie să aibă cel puțin o mărime"}
                        className="w-full"
                    >
                        Șterge
                    </Button>
                </form>
            </div>

            {state.status === "saved" && !saving && (
                <p className="mt-2 text-sm text-green-700">✓ {state.message}</p>
            )}
            {error && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}