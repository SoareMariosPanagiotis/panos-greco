"use client";

import { useActionState } from "react";
import { createCategory, type CategoryFormState } from "@/app/admin/categorii/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CategoryFormState = { status: "idle", message: "" };

export function NewCategoryForm({ nextSortOrder }: { nextSortOrder: number }) {
    const [state, formAction, pending] = useActionState(createCategory, initialState);

    return (
        <form action={formAction} className="rounded-xl border bg-white p-6">
            <h2 className="font-semibold">Categorie nouă</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_100px_auto] md:items-end md:gap-4">
                <div className="space-y-2">
                    <Label htmlFor="new-category-name">Nume</Label>
                    <Input
                        id="new-category-name"
                        name="name"
                        placeholder="ex: Cafea și băuturi"
                        defaultValue={state.name ?? ""}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-category-order">Ordine</Label>
                    <Input
                        id="new-category-order"
                        name="sortOrder"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={state.sortOrder ?? nextSortOrder}
                        required
                    />
                </div>
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