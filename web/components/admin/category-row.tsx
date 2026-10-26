"use client";

import { useActionState } from "react";
import {
    deleteCategory,
    updateCategory,
    type CategoryFormState,
} from "@/app/admin/categorii/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AdminCategory = {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    productsByCategoryId: { totalCount: number };
};

const initialState: CategoryFormState = { status: "idle", message: "" };

export function CategoryRow({ category }: { category: AdminCategory }) {
    const [state, saveAction, saving] = useActionState(updateCategory, initialState);
    const [deleteState, deleteAction, deleting] = useActionState(deleteCategory, initialState);

    const productCount = category.productsByCategoryId.totalCount;
    const error =
        state.status === "error"
            ? state.message
            : deleteState.status === "error"
                ? deleteState.message
                : null;

    return (
        <div className="border-b px-4 py-4 last:border-b-0">
            <div className="grid gap-3 md:grid-cols-[1fr_100px_110px_90px] md:items-start md:gap-4">
                {/* "contents" lasă câmpurile formularului să stea direct în grilă */}
                <form action={saveAction} className="contents">
                    <input type="hidden" name="id" value={category.id} />
                    <div>
                        <Input
                            name="name"
                            defaultValue={state.name ?? category.name}
                            aria-label="Nume categorie"
                            required
                        />
                        <p className="mt-1 text-xs text-neutral-500">
                            {category.slug} · {productCount} {productCount === 1 ? "produs" : "produse"}
                        </p>
                    </div>
                    <Input
                        name="sortOrder"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={state.sortOrder ?? category.sortOrder}
                        aria-label="Ordine"
                        required
                    />
                    <Button type="submit" disabled={saving} className="bg-olive hover:bg-olive/90">
                        {saving ? "Se salvează..." : "Salvează"}
                    </Button>
                </form>

                <form action={deleteAction}>
                    <input type="hidden" name="id" value={category.id} />
                    <Button
                        type="submit"
                        variant="outline"
                        disabled={deleting || productCount > 0}
                        title={productCount > 0 ? "Are produse, nu poate fi ștearsă" : "Șterge categoria"}
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