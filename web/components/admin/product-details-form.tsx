"use client";

import { useActionState } from "react";
import {
    updateProduct,
    type ProductFormState,
    type ProductFormValues,
} from "@/app/admin/produse/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
    productId: string;
    initial: ProductFormValues;
    categories: { id: string; name: string }[];
};

const initialState: ProductFormState = { status: "idle", message: "" };

export function ProductDetailsForm({ productId, initial, categories }: Props) {
    const [state, formAction, pending] = useActionState(updateProduct, initialState);

    // La eroare păstrăm ce ai scris; altfel folosim valorile din baza de date
    const values = state.values ?? initial;

    return (
        <form action={formAction} className="space-y-5 rounded-xl border bg-white p-6">
            <input type="hidden" name="id" value={productId} />

            <div className="space-y-2">
                <Label htmlFor="name">Nume</Label>
                <Input id="name" name="name" defaultValue={values.name} required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descriere</Label>
                <textarea
                    id="description"
                    name="description"
                    rows={4}
                    defaultValue={values.description}
                    className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-olive/20"
                />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="categoryId">Categorie</Label>
                    <select
                        id="categoryId"
                        name="categoryId"
                        defaultValue={values.categoryId}
                        className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:border-olive"
                    >
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="vatRate">TVA (%)</Label>
                    <Input id="vatRate" name="vatRate" inputMode="decimal" defaultValue={values.vatRate} required />
                </div>
            </div>

            <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        name="isOrganic"
                        defaultChecked={values.isOrganic}
                        className="size-4 accent-olive"
                    />
                    Produs BIO
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={values.isActive}
                        className="size-4 accent-olive"
                    />
                    Vizibil pe site
                </label>
            </div>

            {state.status === "error" && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.message}
                </p>
            )}

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                    {pending ? "Se salvează..." : "Salvează detaliile"}
                </Button>
                {state.status === "saved" && !pending && (
                    <span className="text-sm text-green-700">✓ {state.message}</span>
                )}
            </div>
        </form>
    );
}