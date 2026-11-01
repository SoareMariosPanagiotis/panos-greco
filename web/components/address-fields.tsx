"use client";

import { useEffect, useMemo, useState } from "react";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTIES } from "@/lib/counties";
import { getLocalities, type Locality } from "@/lib/localities";

// Câmpurile unei adrese: județ, localitate, adresă, cod poștal.
// Aceleași în „Adresele mele” și la comandă, ca să arate și să se verifice la fel.
//
// Câmpurile pornesc de la `defaults` doar când componenta apare pe pagină.
// Dacă vin alte valori de la server (de exemplu după o eroare), părintele îi schimbă `key`
// și React o construiește din nou cu ele.

// Județele nu se schimbă: lista de variante o facem o singură dată
const COUNTY_OPTIONS: ComboboxOption[] = COUNTIES.map((county) => ({ value: county, label: county }));

type Props = {
    // Ce scrie inițial în câmpuri (adresa salvată, sau ce a completat înainte de o eroare)
    defaults?: { county?: string; city?: string; address?: string; postalCode?: string | null };
    // Livrarea locală merge doar într-un oraș: îl blocăm în câmp
    fixedCity?: string | null;
};

export function AddressFields({ defaults, fixedCity }: Props) {
    // Județul de pornire. La un oraș fix care e și județ (ex. Galați), vine ales din start.
    const startCounty = defaults?.county || (fixedCity && COUNTIES.includes(fixedCity) ? fixedCity : "");
    const [county, setCounty] = useState(startCounty);

    // Localitățile județului ales, cerute de la server. Ținem minte și județul lor,
    // ca să nu arătăm nici măcar o clipă localitățile județului de dinainte.
    const [loaded, setLoaded] = useState<{ county: string; list: Locality[] } | null>(null);

    useEffect(() => {
        if (!county || fixedCity) return;
        let ignore = false;
        getLocalities(county)
            .then((list) => {
                if (!ignore) setLoaded({ county, list });
            })
            .catch(() => {
                if (!ignore) setLoaded({ county, list: [] });
            });
        return () => {
            ignore = true;
        };
    }, [county, fixedCity]);

    const localities = loaded?.county === county ? loaded.list : null; // null = se încarcă
    const localityOptions = useMemo(
        () =>
            localities?.map((locality) => ({
                value: locality.label,
                label: locality.label,
                tag: locality.isUrban ? "oraș" : undefined,
                featured: locality.isUrban, // orașele apar primele
            })) ?? null,
        [localities],
    );

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="county">Județ</Label>
                <Combobox
                    id="county"
                    name="county"
                    options={COUNTY_OPTIONS}
                    defaultValue={startCounty}
                    placeholder="Alege județul"
                    emptyText="Niciun județ găsit"
                    invalidText="Alege județul din listă."
                    onValueChange={setCounty}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="city">Localitate</Label>
                {fixedCity ? (
                    <Input id="city" name="city" value={fixedCity} readOnly className="bg-neutral-50" />
                ) : localities?.length === 0 ? (
                    // Lista n-a putut fi încărcată (server căzut, date lipsă): o scrie de mână
                    <Input
                        id="city"
                        name="city"
                        autoComplete="address-level2"
                        maxLength={100}
                        defaultValue={defaults?.city ?? ""}
                        required
                    />
                ) : !county ? (
                    <Input id="city" placeholder="Alege întâi județul" disabled />
                ) : (
                    <Combobox
                        // key: alt județ = câmp nou, gol (localitatea veche nu e în județul nou)
                        key={county}
                        id="city"
                        name="city"
                        options={localityOptions}
                        defaultValue={county === startCounty ? (defaults?.city ?? "") : ""}
                        placeholder="Alege localitatea"
                        emptyText="Nicio localitate găsită"
                        invalidText="Alege localitatea din listă."
                    />
                )}
            </div>
            <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adresă</Label>
                <Input
                    id="address"
                    name="address"
                    autoComplete="street-address"
                    placeholder="Stradă, număr, bloc, scară, apartament"
                    maxLength={200}
                    defaultValue={defaults?.address ?? ""}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="postalCode">Cod poștal (opțional)</Label>
                <Input
                    id="postalCode"
                    name="postalCode"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="postal-code"
                    defaultValue={defaults?.postalCode ?? ""}
                />
            </div>
        </div>
    );
}
