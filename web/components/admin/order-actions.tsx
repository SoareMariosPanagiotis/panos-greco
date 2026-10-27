"use client";

import { useActionState, type FormEvent } from "react";
import {
    changeOrderStatus,
    markOrderPaid,
    type OrderActionState,
} from "@/app/admin/comenzi/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: OrderActionState = { status: "idle", message: "" };

// Sugestii pentru câmpul de curier (poți scrie și altă firmă)
const COURIERS = ["Cargus", "Sameday", "FAN Courier", "DPD", "GLS"];

type Props = {
    orderId: string;
    orderNumber: number;
    status: string;
    paymentStatus: string;
    needsAddress: boolean; // false = ridicare din magazin
    needsAwb: boolean; // true = curier, AWB obligatoriu
};

type StatusFormProps = {
    orderId: string;
    next: string;
    label: string;
    action: (formData: FormData) => void;
    disabled: boolean;
    danger?: boolean;
    onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
};

// Un buton = un formular mic care trimite starea următoare
function StatusForm({ orderId, next, label, action, disabled, danger = false, onSubmit }: StatusFormProps) {
    return (
        <form action={action} onSubmit={onSubmit}>
            <input type="hidden" name="id" value={orderId} />
            <input type="hidden" name="status" value={next} />
            <Button
                type="submit"
                disabled={disabled}
                variant={danger ? "outline" : "default"}
                className={
                    danger
                        ? "w-full border-red-300 text-red-700 hover:bg-red-50"
                        : "w-full bg-olive hover:bg-olive/90"
                }
            >
                {label}
            </Button>
        </form>
    );
}

export function OrderActions({ orderId, orderNumber, status, paymentStatus, needsAddress, needsAwb }: Props) {
    const [state, statusAction, changing] = useActionState(changeOrderStatus, initialState);
    const [payState, payAction, paying] = useActionState(markOrderPaid, initialState);
    const busy = changing || paying;

    // Anularea nu se poate desface: întrebăm înainte
    function confirmCancel(event: FormEvent<HTMLFormElement>) {
        const question = `Anulezi comanda #${orderNumber}? Stocul revine automat, iar comanda nu mai poate fi redeschisă.`;
        if (!window.confirm(question)) event.preventDefault();
    }

    const cancelButton = (label = "Anulează comanda") => (
        <StatusForm
            orderId={orderId}
            next="cancelled"
            label={label}
            action={statusAction}
            disabled={busy}
            danger
            onSubmit={confirmCancel}
        />
    );

    const error = state.status === "error" ? state.message : payState.status === "error" ? payState.message : null;
    const success = !busy && state.status === "saved" ? state.message : null;

    return (
        <div className="space-y-3">
            {/* Fiecare stare are doar butoanele săgeților din diagramă */}
            {status === "new" && (
                <>
                    <StatusForm
                        orderId={orderId}
                        next="confirmed"
                        label="Confirmă comanda"
                        action={statusAction}
                        disabled={busy}
                    />
                    {cancelButton()}
                </>
            )}

            {status === "confirmed" && !needsAddress && (
                <>
                    <StatusForm
                        orderId={orderId}
                        next="ready_for_pickup"
                        label="Gata de ridicare"
                        action={statusAction}
                        disabled={busy}
                    />
                    {cancelButton()}
                </>
            )}

            {status === "confirmed" && needsAddress && (
                <>
                    <form action={statusAction} className="space-y-2">
                        <input type="hidden" name="id" value={orderId} />
                        <input type="hidden" name="status" value="shipped" />
                        <Input
                            name="courier"
                            list="couriers"
                            maxLength={40}
                            required={needsAwb}
                            defaultValue={state.courier}
                            placeholder={needsAwb ? "Firma de curierat" : "Curier (opțional)"}
                            aria-label="Firma de curierat"
                        />
                        <datalist id="couriers">
                            {COURIERS.map((courier) => (
                                <option key={courier} value={courier} />
                            ))}
                        </datalist>
                        <Input
                            name="awb"
                            maxLength={30}
                            pattern="[A-Za-z0-9]{4,30}"
                            title="Doar litere și cifre, fără spații"
                            required={needsAwb}
                            defaultValue={state.awb}
                            placeholder={needsAwb ? "Număr AWB" : "AWB (opțional)"}
                            aria-label="Număr AWB"
                        />
                        <Button type="submit" disabled={busy} className="w-full bg-olive hover:bg-olive/90">
                            Marchează ca expediată
                        </Button>
                    </form>
                    {cancelButton()}
                </>
            )}

            {status === "shipped" && (
                <>
                    <StatusForm
                        orderId={orderId}
                        next="delivered"
                        label="Marchează ca livrată"
                        action={statusAction}
                        disabled={busy}
                    />
                    {cancelButton("Anulează (colet refuzat)")}
                </>
            )}

            {status === "ready_for_pickup" && (
                <>
                    <StatusForm
                        orderId={orderId}
                        next="delivered"
                        label="Ridicată de client"
                        action={statusAction}
                        disabled={busy}
                    />
                    {cancelButton("Anulează (nu a venit)")}
                </>
            )}

            {status === "delivered" && (
                <p className="text-neutral-600">Comanda e livrată. Starea nu se mai schimbă.</p>
            )}
            {status === "cancelled" && (
                <p className="text-neutral-600">Comanda e anulată, iar stocul a revenit.</p>
            )}

            {/* Plata merge separat de stare: banii de la ramburs pot veni după livrare */}
            {paymentStatus === "pending" && status !== "cancelled" && (
                <form action={payAction} className="border-t pt-3">
                    <input type="hidden" name="id" value={orderId} />
                    <Button type="submit" variant="outline" disabled={busy} className="w-full">
                        Marchează ca plătită
                    </Button>
                </form>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}
            {success && <p className="text-sm text-green-700">✓ {success}</p>}
        </div>
    );
}