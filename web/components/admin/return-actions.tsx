"use client";

import { useActionState } from "react";
import { updateReturn, type ReturnActionState } from "@/app/admin/retururi/actions";
import { Button } from "@/components/ui/button";

const initialState: ReturnActionState = { status: "idle", message: "" };

const textareaClass =
    "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-olive/20";

type ReturnActionsProps = {
    id: string;
    status: string;
    adminNote: string | null;
};

// Butoanele pentru pașii următori: primită → produse primite → bani returnați (sau închisă)
export function ReturnActions({ id, status, adminNote }: ReturnActionsProps) {
    const [state, formAction, pending] = useActionState(updateReturn, initialState);
    const open = status === "received" || status === "goods_received";

    return (
        <form action={formAction} className="space-y-3">
            <input type="hidden" name="id" value={id} />

            <div className="space-y-1">
                <label htmlFor={`note-${id}`} className="text-xs font-medium text-neutral-600">
                    Notă internă (o vezi doar tu)
                </label>
                <textarea
                    id={`note-${id}`}
                    name="adminNote"
                    rows={2}
                    maxLength={1000}
                    defaultValue={adminNote ?? ""}
                    placeholder="ex: returnat 1 × 500 ml, sigilat; transfer făcut pe 3 nov."
                    className={textareaClass}
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {status === "received" && (
                    <Button type="submit" name="intent" value="goods_received" disabled={pending} variant="outline">
                        Am primit produsele
                    </Button>
                )}
                {open && (
                    <Button
                        type="submit"
                        name="intent"
                        value="refunded"
                        disabled={pending}
                        className="bg-olive text-white hover:bg-olive/90"
                    >
                        Am returnat banii
                    </Button>
                )}
                {open && (
                    <Button type="submit" name="intent" value="closed" disabled={pending} variant="ghost">
                        Închide fără rambursare
                    </Button>
                )}
                <Button type="submit" name="intent" value="note" disabled={pending} variant="ghost">
                    Salvează nota
                </Button>
            </div>

            {open && (
                <p className="text-xs text-neutral-500">
                    „Închide fără rambursare” e pentru cazurile în care nu e nimic de returnat (de exemplu, comanda a
                    fost anulată înainte să plece). La final, IBAN-ul clientului se șterge automat.
                </p>
            )}

            {state.status === "error" && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.message}
                </p>
            )}
            {state.status === "saved" && !pending && <p className="text-sm text-green-700">✓ {state.message}</p>}
        </form>
    );
}
