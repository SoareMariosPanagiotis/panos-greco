"use client";

import { useActionState } from "react";
import { deleteProduct, type DeleteProductState } from "@/app/admin/produse/actions";
import { Button } from "@/components/ui/button";

const initialState: DeleteProductState = { error: null };

type Props = { productId: string; productName: string };

export function DeleteProductForm({ productId, productName }: Props) {
    const [state, formAction, pending] = useActionState(deleteProduct, initialState);

    return (
        <form
            action={formAction}
            onSubmit={(event) => {
                if (!window.confirm(`Ștergi definitiv „${productName}” și toate mărimile lui?`)) {
                    event.preventDefault();
                }
            }}
            className="rounded-xl border border-red-200 bg-red-50/50 p-6"
        >
            <input type="hidden" name="id" value={productId} />
            <h2 className="font-semibold text-red-700">Ștergere produs</h2>
            <p className="mt-1 text-sm text-neutral-600">
                Folosește ștergerea doar pentru produse adăugate din greșeală. Ca să scoți un produs de pe
                site, debifează „Vizibil pe site”.
            </p>

            {state.error && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <Button
                type="submit"
                variant="outline"
                disabled={pending}
                className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
            >
                {pending ? "Se șterge..." : "Șterge produsul"}
            </Button>
        </form>
    );
}