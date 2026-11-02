"use client";

import { useActionState, useState } from "react";
import { cancelOrder, type CancelOrderState } from "@/app/comanda/cancel-actions";
import { Button } from "@/components/ui/button";
import { CUSTOMER_CANCEL_REASONS } from "@/lib/orders";

const initialState: CancelOrderState = { status: "idle", message: "" };

// Anularea nu se poate desface, așa că are doi pași, ca la eMAG: „Anulează comanda”, apoi
// „Confirmă anularea”. Pasul al doilea e și confirmarea cerută de lege pentru retragere.
export function CancelOrder({ orderId, className = "" }: { orderId: string; className?: string }) {
    const [open, setOpen] = useState(false);
    const [state, action, pending] = useActionState(cancelOrder, initialState);

    if (state.status === "done") {
        return (
            <p role="status" className={`rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 ${className}`}>
                ✓ {state.message}
            </p>
        );
    }

    if (!open) {
        return (
            <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(true)}
                className={`border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 ${className}`}
            >
                Anulează comanda
            </Button>
        );
    }

    return (
        <form action={action} className={`space-y-3 rounded-lg border border-red-200 bg-red-50/60 p-4 ${className}`}>
            <input type="hidden" name="orderId" value={orderId} />
            <div>
                <p className="font-medium text-neutral-900">Sigur vrei să anulezi comanda?</p>
                <p className="mt-1 text-neutral-600">
                    Anularea e definitivă: comanda nu mai pleacă, iar confirmarea îți vine pe email.
                </p>
            </div>
            <label className="block">
                <span className="text-neutral-700">De ce o anulezi? (nu e obligatoriu)</span>
                <select
                    name="reason"
                    defaultValue=""
                    className="mt-1 block w-full rounded-lg border bg-white px-3 py-2 outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-olive/20"
                >
                    <option value="">Prefer să nu spun</option>
                    {Object.entries(CUSTOMER_CANCEL_REASONS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </label>
            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending} className="bg-red-700 text-white hover:bg-red-800">
                    {pending ? "Se anulează..." : "Confirmă anularea"}
                </Button>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
                    Nu, păstrez comanda
                </Button>
            </div>
            {state.status === "error" && (
                <p role="alert" className="text-red-700">
                    {state.message}
                </p>
            )}
        </form>
    );
}
