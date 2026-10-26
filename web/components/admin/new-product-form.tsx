"use client";

import { useActionState } from "react";
import { createProduct, type NewProductState } from "@/app/admin/produse/actions";
import { VariantFields } from "@/components/admin/variant-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: NewProductState = { error: null };

const selectClass =
    "h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:border-olive";

export function NewProductForm({ categories }: { categories: { id: string; name: string }[] }) {
    const [state, formAction, pending] = useActionState(createProduct, initialState);
    const values = state.values;

    return (
        <form action={formAction} className="space-y-6 rounded-xl border bg-white p-6">
            <div className="space-y-2">
                <Label htmlFor="name">Nume</Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="ex: Mastică de Chios"
                    defaultValue={values?.name ?? ""}
                    required
                />
                <p className="text-xs text-neutral-500">Adresa paginii se face automat din nume.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="categoryId">Categorie</Label>
                    <select
                        id="categoryId"
                        name="categoryId"
                        defaultValue={values?.categoryId ?? ""}
                        className={selectClass}
                        required
                    >
                        <option value="" disabled>
                            Alege categoria
                        </option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="vatRate">TVA (%)</Label>
                    <Input
                        id="vatRate"
                        name="vatRate"
                        inputMode="decimal"
                        defaultValue={values?.vatRate ?? "11"}
                        required
                    />
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    name="isOrganic"
                    defaultChecked={values?.isOrganic ?? false}
                    className="size-4 accent-olive"
                />
                Produs BIO
            </label>

            <fieldset className="rounded-lg border p-4">
                <legend className="px-1 text-sm font-medium">Prima mărime</legend>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <VariantFields idPrefix="first" values={values} />
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                    Scrie litrii în ml și kilogramele în g (1 l = 1000 ml, 2 kg = 2000 g). Celelalte mărimi le
                    adaugi după creare.
                </p>
            </fieldset>

            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <div>
                <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                    {pending ? "Se creează..." : "Creează produsul"}
                </Button>
                <p className="mt-2 text-xs text-neutral-500">
                    Produsul se creează ascuns. Îl faci vizibil după ce îi completezi detaliile.
                </p>
            </div>
        </form>
    );
}