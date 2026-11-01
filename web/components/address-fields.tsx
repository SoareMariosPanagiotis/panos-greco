"use client";

import { useEffect, useMemo, useState } from "react";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTIES } from "@/lib/counties";
import { getLocalities, type Locality } from "@/lib/localities";
import { findPostalCode } from "@/lib/postal-codes";

// Câmpurile unei adrese: județ, localitate, adresă, cod poștal.
// Aceleași în „Adresele mele” și la comandă, ca să arate și să se verifice la fel.
// Codul poștal se completează singur din localitate și adresă (vezi lib/postal-codes.ts).
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
    const [city, setCity] = useState(defaults?.city ?? "");
    const [street, setStreet] = useState(defaults?.address ?? "");
    // Codul poștal. auto = l-am completat noi, deci îl putem schimba când se schimbă adresa.
    // Unul scris de client (sau salvat deja) nu îl atingem.
    const [postal, setPostal] = useState({ value: defaults?.postalCode ?? "", auto: !defaults?.postalCode });
    const locality = fixedCity ?? city;

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

    // Codul poștal: îl cerem când clientul se oprește din scris (după 0,4 secunde),
    // nu la fiecare literă. Pentru un sat vine imediat; într-un oraș mare, după stradă și număr.
    useEffect(() => {
        let ignore = false;
        const timer = setTimeout(async () => {
            const code = county && locality ? await findPostalCode(county, locality, street) : null;
            if (!ignore) setPostal((current) => (current.auto ? { value: code ?? "", auto: true } : current));
        }, 400);
        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [county, locality, street]);

    // Alt județ sau altă localitate = altă adresă: codul vechi nu mai e bun, îl caută din nou
    function changeCounty(value: string) {
        setCounty(value);
        setCity(value === startCounty ? (defaults?.city ?? "") : "");
        setPostal((current) => ({ ...current, auto: true }));
    }

    function changeCity(value: string) {
        setCity(value);
        setPostal((current) => ({ ...current, auto: true }));
    }

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
                    onValueChange={changeCounty}
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
                        onValueChange={changeCity}
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
                    onChange={(event) => setStreet(event.target.value)}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="postalCode">Cod poștal</Label>
                <Input
                    id="postalCode"
                    name="postalCode"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="postal-code"
                    value={postal.value}
                    onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, ""); // doar cifre
                        // Dacă îl șterge, îl putem completa din nou noi
                        setPostal({ value, auto: value === "" });
                    }}
                />
            </div>
        </div>
    );
}
