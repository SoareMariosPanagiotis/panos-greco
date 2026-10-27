"use client";

import { useActionState } from "react";
import {
    updateDeliveryMethod,
    updatePaymentMethod,
    type MethodFormState,
    type MethodFormValues,
} from "@/app/admin/livrare/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AdminDeliveryMethod = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    price: string;
    freeOver: string | null;
    needsAddress: boolean;
    needsAwb: boolean;
    city: string | null;
    isActive: boolean;
    sortOrder: number;
};

export type AdminPaymentMethod = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    fee: string;
    isActive: boolean;
    sortOrder: number;
};

const initialState: MethodFormState = { status: "idle", message: "" };

const textareaClass =
    "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-olive/20";

// Postgres trimite „20.00”; în formular e mai curat „20”
function plain(amount: string | null) {
    return amount === null ? "" : String(Number(amount));
}

// Mesajul de eroare + butonul de salvare, la fel pentru ambele formulare
function FormFooter({ state, pending }: { state: MethodFormState; pending: boolean }) {
    return (
        <>
            {state.status === "error" && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.message}
                </p>
            )}
            <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                    {pending ? "Se salvează..." : "Salvează"}
                </Button>
                {state.status === "saved" && !pending && (
                    <span className="text-sm text-green-700">✓ {state.message}</span>
                )}
            </div>
        </>
    );
}

// ---------- O metodă de livrare ----------

export function DeliveryMethodForm({ method }: { method: AdminDeliveryMethod }) {
    const [state, formAction, pending] = useActionState(updateDeliveryMethod, initialState);

    // La eroare păstrăm ce ai scris; altfel folosim valorile din baza de date
    const values: MethodFormValues = state.values ?? {
        name: method.name,
        description: method.description ?? "",
        amount: plain(method.price),
        freeOver: plain(method.freeOver),
        sortOrder: String(method.sortOrder),
        isActive: method.isActive,
        needsAwb: method.needsAwb,
    };

    // Id-urile câmpurilor trebuie să fie unice pe pagină, de aceea pornesc de la cod
    const key = `livrare-${method.code}`;

    // Tipul livrării (cu adresă sau ridicare) și orașul nu se schimbă de aici
    const scope = !method.needsAddress
        ? "Fără adresă: clientul ridică din magazin"
        : method.city
            ? `Doar în ${method.city}`
            : "În toată România";

    return (
        <form action={formAction} className="space-y-4 border-b p-6 last:border-b-0">
            <input type="hidden" name="id" value={method.id} />

            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{method.name}</h3>
                <span className="text-xs text-neutral-500">
                    {scope} · cod: {method.code}
                </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_130px_150px_90px]">
                <div className="space-y-2">
                    <Label htmlFor={`${key}-name`}>Nume pe site</Label>
                    <Input id={`${key}-name`} name="name" defaultValue={values.name} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${key}-amount`}>Preț (lei)</Label>
                    <Input
                        id={`${key}-amount`}
                        name="amount"
                        inputMode="decimal"
                        defaultValue={values.amount}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${key}-freeOver`}>Gratuit peste (lei)</Label>
                    <Input
                        id={`${key}-freeOver`}
                        name="freeOver"
                        inputMode="decimal"
                        defaultValue={values.freeOver}
                        placeholder="niciodată"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${key}-sortOrder`}>Ordine</Label>
                    <Input
                        id={`${key}-sortOrder`}
                        name="sortOrder"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={values.sortOrder}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${key}-description`}>Descriere (o vede clientul la comandă)</Label>
                <textarea
                    id={`${key}-description`}
                    name="description"
                    rows={2}
                    maxLength={300}
                    defaultValue={values.description}
                    className={textareaClass}
                />
            </div>

            <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={values.isActive}
                        className="size-4 accent-olive"
                    />
                    Activă pe site
                </label>
                {method.needsAddress && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="needsAwb"
                            defaultChecked={values.needsAwb}
                            className="size-4 accent-olive"
                        />
                        Cere AWB la expediere
                    </label>
                )}
            </div>

            <FormFooter state={state} pending={pending} />
        </form>
    );
}

// ---------- O metodă de plată ----------

export function PaymentMethodForm({ method }: { method: AdminPaymentMethod }) {
    const [state, formAction, pending] = useActionState(updatePaymentMethod, initialState);

    const values: MethodFormValues = state.values ?? {
        name: method.name,
        description: method.description ?? "",
        amount: plain(method.fee),
        freeOver: "",
        sortOrder: String(method.sortOrder),
        isActive: method.isActive,
        needsAwb: false,
    };

    const key = `plata-${method.code}`;

    // Cardul rămâne oprit până integrăm plata online
    const cardLocked = method.code === "card" && !method.isActive;

    return (
        <form action={formAction} className="space-y-4 border-b p-6 last:border-b-0">
            <input type="hidden" name="id" value={method.id} />

            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{method.name}</h3>
                <span className="text-xs text-neutral-500">cod: {method.code}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_130px_90px]">
                <div className="space-y-2">
                    <Label htmlFor={`${key}-name`}>Nume pe site</Label>
                    <Input id={`${key}-name`} name="name" defaultValue={values.name} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${key}-amount`}>Taxă (lei)</Label>
                    <Input
                        id={`${key}-amount`}
                        name="amount"
                        inputMode="decimal"
                        defaultValue={values.amount}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${key}-sortOrder`}>Ordine</Label>
                    <Input
                        id={`${key}-sortOrder`}
                        name="sortOrder"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={values.sortOrder}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${key}-description`}>Descriere (o vede clientul la comandă)</Label>
                <textarea
                    id={`${key}-description`}
                    name="description"
                    rows={2}
                    maxLength={300}
                    defaultValue={values.description}
                    className={textareaClass}
                />
            </div>

            <div className="space-y-1">
                <label className={`flex items-center gap-2 text-sm ${cardLocked ? "text-neutral-400" : ""}`}>
                    <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={values.isActive}
                        disabled={cardLocked}
                        className="size-4 accent-olive"
                    />
                    Activă pe site
                </label>
                {cardLocked && (
                    <p className="text-xs text-neutral-500">
                        Se poate activa după ce integrăm plata online (Netopia, Stripe etc.).
                    </p>
                )}
            </div>

            <FormFooter state={state} pending={pending} />
        </form>
    );
}