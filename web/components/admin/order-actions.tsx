"use client";

import { useActionState, useState } from "react";
import {
    changeOrderStatus,
    markOrderPaid,
    type OrderActionState,
} from "@/app/admin/comenzi/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CANCEL_REASONS, cancelReasonLabel, formatOrderDate, type CancelReason } from "@/lib/orders";

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
    cancelReason: string | null; // de ce a fost anulată (dacă e anulată)
    cancelledBy: string | null; // migrația 031: „customer” = a anulat-o clientul, din site
    cancelledAt: string | null;
    cancelDetails: string | null; // motivul ales de client, dacă a ales unul
    invoiceLabel: string | null; // factura emisă, nestornată (ex: „PGW 3000”), dacă există
};

type StatusFormProps = {
    orderId: string;
    next: string;
    label: string;
    action: (formData: FormData) => void;
    disabled: boolean;
};

// Motivele potrivite pentru fiecare stare; primul e cel ales din start
const REASONS_BY_STATUS: Record<string, CancelReason[]> = {
    new: ["customer", "shop", "other"],
    confirmed: ["customer", "shop", "other"],
    shipped: ["refused", "customer", "other"],
    ready_for_pickup: ["not_collected", "customer", "other"],
};

type CancelOrderProps = {
    orderId: string;
    orderNumber: number;
    status: string;
    label: string;
    invoiceLabel: string | null;
    action: (formData: FormData) => void;
    disabled: boolean;
};

// Anularea nu se poate desface: întâi alegi motivul și vezi ce se întâmplă, apoi confirmi
function CancelOrder({ orderId, orderNumber, status, label, invoiceLabel, action, disabled }: CancelOrderProps) {
    const [open, setOpen] = useState(false);
    const reasons = REASONS_BY_STATUS[status] ?? ["other"];
    const danger = "w-full border-red-300 text-red-700 hover:bg-red-50";

    if (!open) {
        return (
            <Button type="button" variant="outline" disabled={disabled} className={danger} onClick={() => setOpen(true)}>
                {label}
            </Button>
        );
    }

    return (
        <form action={action} className="space-y-3 rounded-lg border border-red-200 bg-red-50/60 p-3">
            <input type="hidden" name="id" value={orderId} />
            <input type="hidden" name="status" value="cancelled" />
            <label className="block space-y-1">
                <span className="font-medium">Anulezi comanda #{orderNumber}. Motivul:</span>
                <select
                    name="cancelReason"
                    defaultValue={reasons[0]}
                    className="w-full rounded-lg border bg-white px-2 py-1.5 text-sm"
                >
                    {reasons.map((reason) => (
                        <option key={reason} value={reason}>
                            {CANCEL_REASONS[reason]}
                        </option>
                    ))}
                </select>
            </label>
            <ul className="list-disc space-y-1 pl-4 text-xs text-neutral-700">
                <li>Stocul revine automat, iar comanda nu mai poate fi redeschisă.</li>
                {invoiceLabel && (
                    <li>
                        Factura <strong>{invoiceLabel}</strong> se stornează automat, iar clientul primește stornarea pe
                        email.
                    </li>
                )}
            </ul>
            <div className="flex gap-2">
                <Button type="submit" disabled={disabled} className="bg-red-700 text-white hover:bg-red-800">
                    Da, anulează
                </Button>
                <Button type="button" variant="ghost" disabled={disabled} onClick={() => setOpen(false)}>
                    Renunță
                </Button>
            </div>
        </form>
    );
}

// Un buton = un formular mic care trimite starea următoare
function StatusForm({ orderId, next, label, action, disabled }: StatusFormProps) {
    return (
        <form action={action}>
            <input type="hidden" name="id" value={orderId} />
            <input type="hidden" name="status" value={next} />
            <Button type="submit" disabled={disabled} className="w-full bg-olive hover:bg-olive/90">
                {label}
            </Button>
        </form>
    );
}

export function OrderActions({
    orderId,
    orderNumber,
    status,
    paymentStatus,
    needsAddress,
    needsAwb,
    cancelReason,
    cancelledBy,
    cancelledAt,
    cancelDetails,
    invoiceLabel,
}: Props) {
    const [state, statusAction, changing] = useActionState(changeOrderStatus, initialState);
    const [payState, payAction, paying] = useActionState(markOrderPaid, initialState);
    const busy = changing || paying;

    const cancelButton = (label = "Anulează comanda") => (
        <CancelOrder
            orderId={orderId}
            orderNumber={orderNumber}
            status={status}
            label={label}
            invoiceLabel={invoiceLabel}
            action={statusAction}
            disabled={busy}
        />
    );
    const reason = cancelReasonLabel(cancelReason);

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
                <div className="space-y-2 text-neutral-600">
                    <p>
                        Comanda e anulată{reason ? ` (${reason})` : ""}, iar stocul a revenit.
                    </p>
                    {cancelledBy === "customer" && (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                            A anulat-o clientul, din site{cancelledAt ? `, pe ${formatOrderDate(cancelledAt)}` : ""}.
                            {cancelDetails ? ` Motivul lui: „${cancelDetails}”.` : ""} Dacă ai apucat să faci AWB, anulează-l
                            și la curier.
                        </p>
                    )}
                </div>
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