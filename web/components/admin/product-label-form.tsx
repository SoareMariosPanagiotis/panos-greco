"use client";

import { useActionState } from "react";
import { saveProductLabel, type LabelState, type LabelValues } from "@/app/admin/produse/label-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LabelState = { status: "idle", message: "" };

const textareaClass =
    "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-olive/20";

// Câmpurile de text, în ordinea de pe o etichetă
const TEXTS: { name: keyof LabelValues; label: string; hint?: string; rows?: number; placeholder?: string }[] = [
    {
        name: "ingredients",
        label: "Ingrediente",
        hint: "Ca pe etichetă. Alergenii îi pui între steluțe, ex: făină de *grâu*, *susan*: pe site apar îngroșați. La produsele cu un singur ingredient (ex: uleiul) poate lipsi.",
        rows: 3,
    },
    { name: "mayContain", label: "Poate conține urme de", placeholder: "ex: nuci, arahide" },
    { name: "storage", label: "Condiții de păstrare", placeholder: "ex: la loc uscat și răcoros, ferit de lumină" },
    { name: "usageNotes", label: "Mod de folosire", placeholder: "ex: se consumă de preferință crud" },
    { name: "origin", label: "Țara de origine", placeholder: "ex: Grecia" },
    {
        name: "producer",
        label: "Producător / ambalator",
        hint: "Numele și adresa, exact ca pe etichetă.",
    },
    { name: "organicCode", label: "Cod organism de control bio", placeholder: "ex: GR-BIO-01", hint: "Doar la produsele bio." },
    {
        name: "labelNotes",
        label: "Alte mențiuni de pe etichetă",
        hint: "ex: la uleiul extravirgin, categoria („Ulei de măsline de categorie superioară obținut direct din măsline și numai prin procedee mecanice”).",
        rows: 3,
    },
];

// Tabelul nutrițional, în ordinea cerută de regulament
const NUTRIENTS: { name: keyof LabelValues; label: string; unit: string; optional?: boolean }[] = [
    { name: "energyKj", label: "Energie", unit: "kJ" },
    { name: "energyKcal", label: "Energie", unit: "kcal" },
    { name: "fat", label: "Grăsimi", unit: "g" },
    { name: "saturates", label: "din care acizi grași saturați", unit: "g" },
    { name: "carbohydrate", label: "Glucide", unit: "g" },
    { name: "sugars", label: "din care zaharuri", unit: "g" },
    { name: "fibre", label: "Fibre (opțional)", unit: "g", optional: true },
    { name: "protein", label: "Proteine", unit: "g" },
    { name: "salt", label: "Sare", unit: "g" },
];

export function ProductLabelForm({ productId, initial }: { productId: string; initial: LabelValues }) {
    const [state, formAction, pending] = useActionState(saveProductLabel, initialState);
    // La eroare păstrăm ce ai scris; altfel pornim de la ce e salvat
    const values = state.values ?? initial;

    return (
        <form action={formAction} className="space-y-6 rounded-xl border bg-white p-6">
            <input type="hidden" name="id" value={productId} />

            <div className="grid gap-5 sm:grid-cols-2">
                {TEXTS.map((field) => (
                    <div key={field.name} className={`space-y-2 ${field.rows ? "sm:col-span-2" : ""}`}>
                        <Label htmlFor={`label-${field.name}`}>{field.label}</Label>
                        {field.rows ? (
                            <textarea
                                id={`label-${field.name}`}
                                name={field.name}
                                rows={field.rows}
                                placeholder={field.placeholder}
                                defaultValue={values[field.name]}
                                className={textareaClass}
                            />
                        ) : (
                            <Input
                                id={`label-${field.name}`}
                                name={field.name}
                                placeholder={field.placeholder}
                                defaultValue={values[field.name]}
                            />
                        )}
                        {field.hint && <p className="text-xs text-neutral-500">{field.hint}</p>}
                    </div>
                ))}
            </div>

            <fieldset className="space-y-3 border-t pt-6">
                <legend className="font-semibold">Valori nutriționale</legend>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-neutral-600">Valori medii la</span>
                    {/* Uleiul se dă de obicei la 100 ml, condimentele la 100 g */}
                    <select
                        name="basis"
                        defaultValue={values.basis}
                        className="h-8 rounded-lg border bg-transparent px-2 text-sm"
                        aria-label="Unitatea de referință"
                    >
                        <option value="100 g">100 g</option>
                        <option value="100 ml">100 ml</option>
                    </select>
                    <span className="text-xs text-neutral-500">Lasă tabelul gol dacă produsul nu are valori pe etichetă.</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    {NUTRIENTS.map((field) => (
                        <div key={field.name} className="space-y-1">
                            <Label htmlFor={`label-${field.name}`} className="text-xs text-neutral-600">
                                {field.label} ({field.unit})
                            </Label>
                            <Input
                                id={`label-${field.name}`}
                                name={field.name}
                                inputMode="decimal"
                                defaultValue={values[field.name]}
                            />
                        </div>
                    ))}
                </div>
            </fieldset>

            {state.status === "error" && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.message}
                </p>
            )}

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                    {pending ? "Se salvează..." : "Salvează eticheta"}
                </Button>
                {state.status === "saved" && !pending && <span className="text-sm text-green-700">✓ {state.message}</span>}
            </div>
        </form>
    );
}
