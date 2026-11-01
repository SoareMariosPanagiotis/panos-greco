"use client";

import { useActionState } from "react";
import { updateShopInfo, type ShopInfoState, type ShopInfoValues } from "@/app/admin/firma/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShopInfo } from "@/lib/shop-info";

const initialState: ShopInfoState = { status: "idle", message: "" };

type Field = {
    name: keyof ShopInfoValues;
    label: string;
    hint?: string;
    placeholder?: string;
    type?: string;
    wide?: boolean; // ocupă tot rândul
};

const FIELDS: Field[] = [
    { name: "legalName", label: "Denumirea firmei", placeholder: "PANOS GRECO S.R.L.", wide: true },
    { name: "cui", label: "CUI", placeholder: "RO12345678", hint: "Cu RO în față dacă firma e plătitoare de TVA." },
    { name: "regCom", label: "Nr. Registrul Comerțului", placeholder: "J17/123/2020" },
    {
        name: "registeredOffice",
        label: "Sediul social",
        hint: "Adresa din certificatul de înregistrare.",
        wide: true,
    },
    {
        name: "shopAddress",
        label: "Adresa magazinului",
        hint: "Aici se ridică comenzile și aici trimit clienții produsele returnate.",
        wide: true,
    },
    { name: "openingHours", label: "Programul magazinului", placeholder: "Luni–Vineri 9–18, Sâmbătă 9–14", wide: true },
    { name: "email", label: "Email de contact", type: "email" },
    { name: "phone", label: "Telefon", placeholder: "0740 123 456", type: "tel" },
];

export function ShopInfoForm({ info }: { info: ShopInfo }) {
    const [state, formAction, pending] = useActionState(updateShopInfo, initialState);

    // La eroare păstrăm ce ai scris; altfel pornim de la ce e salvat
    const values: ShopInfoValues = state.values ?? {
        legalName: info.legalName,
        cui: info.cui ?? "",
        regCom: info.regCom ?? "",
        registeredOffice: info.registeredOffice ?? "",
        shopAddress: info.shopAddress ?? "",
        openingHours: info.openingHours ?? "",
        email: info.email,
        phone: info.phone ?? "",
    };

    return (
        <form action={formAction} className="space-y-5 rounded-xl border bg-white p-6">
            <div className="grid gap-5 sm:grid-cols-2">
                {FIELDS.map((field) => (
                    <div key={field.name} className={`space-y-2 ${field.wide ? "sm:col-span-2" : ""}`}>
                        <Label htmlFor={field.name}>{field.label}</Label>
                        <Input
                            id={field.name}
                            name={field.name}
                            type={field.type ?? "text"}
                            placeholder={field.placeholder}
                            defaultValue={values[field.name]}
                            required={field.name === "legalName" || field.name === "email"}
                        />
                        {field.hint && <p className="text-xs text-neutral-500">{field.hint}</p>}
                    </div>
                ))}
            </div>

            {state.status === "error" && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.message}
                </p>
            )}

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending} className="bg-olive hover:bg-olive/90">
                    {pending ? "Se salvează..." : "Salvează"}
                </Button>
                {state.status === "saved" && !pending && <span className="text-sm text-green-700">✓ {state.message}</span>}
            </div>
        </form>
    );
}
