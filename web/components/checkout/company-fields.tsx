"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { lookupCompany } from "@/app/comanda/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Factura pe firmă, în doi pași, ca la intrarea în cont:
//   1. clientul scrie CUI-ul și apasă „Caută”
//   2. apar datele firmei, completate din registrul fiscal (ANAF); le mai poate corecta
//
// Câmpurile sunt „controlate” (value + onChange): așa le putem completa noi din cod.

type Props = {
    // Ce a completat clientul înainte de o eroare la plasarea comenzii
    defaults?: { companyCui?: string; companyName?: string; companyRegNo?: string; companyAddress?: string };
};

export function CompanyFields({ defaults }: Props) {
    // Dacă revenim după o eroare cu datele deja completate, pornim direct de la pasul 2
    const [step, setStep] = useState<"cui" | "details">(defaults?.companyName ? "details" : "cui");
    const [cui, setCui] = useState(defaults?.companyCui ?? "");
    const [name, setName] = useState(defaults?.companyName ?? "");
    const [regNo, setRegNo] = useState(defaults?.companyRegNo ?? "");
    const [address, setAddress] = useState(defaults?.companyAddress ?? "");
    const [vatStatus, setVatStatus] = useState<string | null>(null); // „plătitoare de TVA”
    const [error, setError] = useState<string | null>(null);
    const [searching, startSearch] = useTransition();
    const cuiRef = useRef<HTMLInputElement>(null);

    // La pasul 1 comanda nu poate pleca: datele firmei încă lipsesc.
    // Browserul arată mesajul ăsta pe câmpul CUI, ca la orice câmp obligatoriu.
    useEffect(() => {
        cuiRef.current?.setCustomValidity(
            step === "cui" && cui.trim() ? "Apasă „Caută” ca să completăm datele firmei." : "",
        );
    }, [step, cui]);

    function search() {
        setError(null);
        startSearch(async () => {
            const result = await lookupCompany(cui);

            if (result.status === "found") {
                const company = result.company;
                setCui(company.cui); // cu RO doar dacă firma e plătitoare de TVA
                setName(company.name);
                setRegNo(company.regNo);
                setAddress(company.address);
                setVatStatus(
                    `${company.vatPayer ? "plătitoare" : "neplătitoare"} de TVA${company.inactive ? " · inactivă fiscal" : ""}`,
                );
                setStep("details");
            } else if (result.status === "error") {
                // Registrul nu răspunde acum: nu blocăm clientul, completează el datele
                setVatStatus(null);
                setError(result.message);
                setStep("details");
            } else {
                setError(result.message);
            }
        });
    }

    // Enter în câmpul CUI caută firma. Altfel ar trimite tot formularul, adică ar plasa comanda!
    function onCuiKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            event.preventDefault();
            if (cui.trim().length >= 2 && !searching) search();
        }
    }

    if (step === "cui") {
        return (
            <div className="space-y-2">
                <Label htmlFor="companyCui">CUI</Label>
                <div className="flex gap-2">
                    <Input
                        ref={cuiRef}
                        id="companyCui"
                        name="companyCui"
                        placeholder="RO12345678"
                        value={cui}
                        onChange={(event) => setCui(event.target.value)}
                        onKeyDown={onCuiKeyDown}
                        required
                    />
                    <Button
                        type="button"
                        onClick={search}
                        disabled={searching || cui.trim().length < 2}
                        className="bg-olive px-5 hover:bg-olive/90"
                    >
                        {searching ? "Se caută..." : "Caută"}
                    </Button>
                </div>
                {error && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Firma aleasă, cu „Schimbă”, ca emailul ales la intrarea în cont */}
            <div className="flex items-center justify-between gap-3 rounded-lg bg-olive-light px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                    <span className="font-medium">CUI {cui}</span>
                    {vatStatus && <span className="text-neutral-600"> · {vatStatus}</span>}
                </span>
                <button
                    type="button"
                    onClick={() => {
                        setError(null);
                        setStep("cui");
                    }}
                    className="shrink-0 font-medium text-olive hover:underline"
                >
                    Schimbă
                </button>
            </div>
            <input type="hidden" name="companyCui" value={cui} />

            {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="companyName">Numele firmei</Label>
                    <Input
                        id="companyName"
                        name="companyName"
                        autoComplete="organization"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="companyAddress">Adresa sediului</Label>
                    <Input
                        id="companyAddress"
                        name="companyAddress"
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="companyRegNo">Nr. Registrul Comerțului</Label>
                    <Input
                        id="companyRegNo"
                        name="companyRegNo"
                        placeholder="J17/123/2020"
                        value={regNo}
                        onChange={(event) => setRegNo(event.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
