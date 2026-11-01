"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { lookupCompany } from "@/app/comanda/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Datele firmei pentru factură. Clientul scrie CUI-ul, apasă „Caută”,
// iar numele, Nr. Reg. Com. și adresa sediului vin de la ANAF.
//
// Câmpurile sunt „controlate” (value + onChange): așa le putem completa noi din cod.
// Rămân modificabile: dacă ANAF nu răspunde sau datele s-au schimbat, clientul le scrie de mână.

type Props = {
    // Ce a completat clientul înainte de o eroare la plasarea comenzii
    defaults?: { companyCui?: string; companyName?: string; companyRegNo?: string; companyAddress?: string };
};

type Note = { tone: "ok" | "warning" | "error"; text: string };

const noteStyles: Record<Note["tone"], string> = {
    ok: "bg-olive-light text-olive",
    warning: "bg-amber-50 text-amber-800",
    error: "bg-red-50 text-red-700",
};

export function CompanyFields({ defaults }: Props) {
    const [cui, setCui] = useState(defaults?.companyCui ?? "");
    const [name, setName] = useState(defaults?.companyName ?? "");
    const [regNo, setRegNo] = useState(defaults?.companyRegNo ?? "");
    const [address, setAddress] = useState(defaults?.companyAddress ?? "");
    const [note, setNote] = useState<Note | null>(null);
    const [searching, startSearch] = useTransition();

    function search() {
        startSearch(async () => {
            const result = await lookupCompany(cui);
            if (result.status !== "found") {
                setNote({ tone: "error", text: result.message });
                return;
            }

            const company = result.company;
            setCui(company.cui); // cu RO doar dacă firma e plătitoare de TVA
            setName(company.name);
            setRegNo(company.regNo);
            setAddress(company.address);
            const vat = company.vatPayer ? "plătitoare de TVA" : "neplătitoare de TVA";
            setNote(
                company.inactive
                    ? { tone: "warning", text: `${company.name} · ${vat} · inactivă la ANAF` }
                    : { tone: "ok", text: `${company.name} · ${vat}` },
            );
        });
    }

    // Enter în câmpul CUI caută firma. Altfel ar trimite tot formularul, adică ar plasa comanda!
    function onCuiKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            event.preventDefault();
            search();
        }
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyCui">CUI</Label>
                <div className="flex gap-2">
                    <Input
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
                        variant="outline"
                        onClick={search}
                        disabled={searching || cui.trim().length < 2}
                    >
                        {searching ? "Se caută..." : "Caută la ANAF"}
                    </Button>
                </div>
                {note && <p className={`rounded-lg px-3 py-2 text-sm ${noteStyles[note.tone]}`}>{note.text}</p>}
            </div>
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
                <Label htmlFor="companyRegNo">Nr. Registrul Comerțului (opțional)</Label>
                <Input
                    id="companyRegNo"
                    name="companyRegNo"
                    placeholder="J17/123/2020"
                    value={regNo}
                    onChange={(event) => setRegNo(event.target.value)}
                />
            </div>
        </div>
    );
}
