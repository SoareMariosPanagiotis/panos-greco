"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

// O listă în care poți și căuta: scrii primele litere și rămân doar variantele potrivite.
// O folosim la Județ și la Localitate. Merge și fără diacritice: „galati” găsește „Galați”.

export type ComboboxOption = {
    value: string; // ce pleacă la server
    label: string; // ce vede clientul
    tag?: string; // etichetă mică în dreapta, ex. „oraș”
    featured?: boolean; // apare înaintea celorlalte potriviri la fel de bune (ex. orașele)
};

// Litere mici, fără diacritice: „Găneasa” → „ganeasa”.
// O literă devine tot o literă, deci pozițiile rămân aceleași și putem îngroșa exact bucata găsită.
const PLAIN: Record<string, string> = { ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t" };

function fold(text: string) {
    let out = "";
    for (const char of text.toLowerCase()) out += PLAIN[char] ?? char;
    return out;
}

// „costi (com. vanatori)” → numele „costi” și comuna „vanatori”
const WITH_PARENT = /^(.*) \((?:com\.|mun\.|oraș) (.*)\)$/;

// Unde începe în `text` un cuvânt cu `query`? -1 = nicăieri
function wordStart(text: string, query: string) {
    for (let index = text.indexOf(query); index !== -1; index = text.indexOf(query, index + 1)) {
        if (index === 0 || /[\s\-.(,]/.test(text[index - 1])) return index;
    }
    return -1;
}

type Match = { option: ComboboxOption; rank: number; start: number; length: number };

// Ordinea rezultatelor:
//   0. începe cu ce ai scris                „ga”       → „Galați”
//   1. alt cuvânt începe așa                „mare”     → „Baia Mare”, „nas” → „Bistrița-Năsăud”
//   2. comuna începe așa (la localități)    „vanatori” → „Costi (com. Vânători)”
// În fiecare grup: întâi cele „featured” (orașele), apoi restul, în ordinea primită (alfabetică).
function findMatches(options: ComboboxOption[], query: string): Match[] {
    const matches: Match[] = [];

    for (const option of options) {
        const label = fold(option.label);
        if (label.startsWith(query)) {
            matches.push({ option, rank: 0, start: 0, length: query.length });
            continue;
        }

        const parts = WITH_PARENT.exec(label);
        const inName = wordStart(parts ? parts[1] : label, query);
        if (inName !== -1) {
            matches.push({ option, rank: 1, start: inName, length: query.length });
            continue;
        }

        const inParent = parts ? wordStart(parts[2], query) : -1;
        if (parts && inParent !== -1) {
            const parentStart = label.length - 1 - parts[2].length; // comuna stă chiar înainte de „)”
            matches.push({ option, rank: 2, start: parentStart + inParent, length: query.length });
        }
    }

    // sort păstrează ordinea primită în fiecare grup
    return matches.sort((a, b) => a.rank - b.rank || Number(b.option.featured ?? 0) - Number(a.option.featured ?? 0));
}

// Varianta din listă care corespunde textului: întâi exact, apoi fără diacritice
function findSelected(options: ComboboxOption[] | null, text: string) {
    const trimmed = text.trim();
    if (!options || !trimmed) return null;
    const plain = fold(trimmed);
    return options.find((option) => option.label === trimmed) ?? options.find((option) => fold(option.label) === plain) ?? null;
}

// Bucata găsită apare îngroșată: „<b>Ga</b>lați”
function Highlight({ text, start, length }: { text: string; start: number; length: number }) {
    if (length === 0) return text;
    return (
        <>
            {text.slice(0, start)}
            <strong className="font-semibold text-olive">{text.slice(start, start + length)}</strong>
            {text.slice(start + length)}
        </>
    );
}

type Props = {
    id: string;
    name: string; // numele câmpului trimis la server
    options: ComboboxOption[] | null; // null = încă se încarcă
    defaultValue?: string;
    placeholder: string; // „Alege județul”
    emptyText: string; // când nu se potrivește nimic: „Niciun județ găsit”
    invalidText: string; // mesajul browserului pentru un text care nu e în listă
    onValueChange?: (value: string) => void; // varianta aleasă; "" = nimic valid
};

export function Combobox({ id, name, options, defaultValue = "", placeholder, emptyText, invalidText, onValueChange }: Props) {
    const [text, setText] = useState(defaultValue);
    const [open, setOpen] = useState(false);
    // typed = clientul a scris de când a deschis lista. Până atunci arătăm toată lista, nu doar varianta aleasă.
    const [typed, setTyped] = useState(false);
    const [active, setActive] = useState(-1); // rândul evidențiat; -1 = niciunul
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();

    const query = fold(text.trim());
    const all = useMemo(() => (options ? findMatches(options, "") : []), [options]);
    const filtered = useMemo(() => (options && typed ? findMatches(options, query) : all), [options, typed, query, all]);
    const activeIndex = Math.min(active, filtered.length - 1);
    const selected = findSelected(options, text);

    // Un text care nu e în listă face câmpul invalid: browserul nu trimite formularul
    // și arată mesajul nostru, la fel ca la un câmp obligatoriu gol
    const invalid = Boolean(options?.length) && query !== "" && !selected;
    useEffect(() => {
        inputRef.current?.setCustomValidity(invalid ? invalidText : "");
    }, [invalid, invalidText]);

    // Rândul evidențiat rămâne la vedere (și la deschidere, și cu săgețile)
    useEffect(() => {
        if (open && activeIndex >= 0) {
            document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
        }
    }, [open, activeIndex, listId]);

    // Schimbă textul și anunță părintele doar când se schimbă varianta aleasă
    function update(next: string) {
        setText(next);
        const nextValue = findSelected(options, next)?.value ?? "";
        if (nextValue !== (selected?.value ?? "")) onValueChange?.(nextValue);
    }

    // La deschidere: toată lista, cu varianta aleasă deja evidențiată
    function openList() {
        if (open) return;
        setOpen(true);
        setTyped(false);
        setActive(all.findIndex((match) => match.option.value === selected?.value));
    }

    function choose(option: ComboboxOption) {
        update(option.label);
        setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                if (open) setActive(Math.min(activeIndex + 1, filtered.length - 1));
                else openList();
                break;
            case "ArrowUp":
                event.preventDefault();
                setActive(Math.max(activeIndex - 1, 0));
                break;
            case "Enter":
                // Enter alege varianta evidențiată. Altfel ar trimite tot formularul, adică ar plasa comanda!
                event.preventDefault();
                if (open && filtered[activeIndex]) choose(filtered[activeIndex].option);
                break;
            case "Escape":
                if (open) {
                    event.preventDefault();
                    setOpen(false);
                }
                break;
        }
    }

    function onBlur() {
        setOpen(false);
        // „galati” scris de mână devine „Galați”; dacă a rămas o singură variantă, o alegem noi
        if (selected) {
            if (text !== selected.label) setText(selected.label);
        } else if (typed && query && filtered.length === 1) {
            choose(filtered[0].option);
        }
    }

    const loading = options === null;

    return (
        <div className="relative">
            <Input
                ref={inputRef}
                id={id}
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
                autoComplete="off"
                spellCheck={false}
                value={text}
                placeholder={loading ? "Se încarcă..." : placeholder}
                disabled={loading}
                required
                className="pr-8"
                onChange={(event) => {
                    update(event.target.value);
                    setOpen(true);
                    setTyped(true);
                    setActive(0); // cea mai bună potrivire, gata de ales cu Enter
                }}
                onFocus={(event) => {
                    event.target.select(); // ce scrii înlocuiește varianta de dinainte
                    openList();
                }}
                onClick={openList}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
            />
            <ChevronDown
                aria-hidden
                className={`pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-neutral-500 transition-transform ${
                    open ? "rotate-180" : ""
                }`}
            />
            {/* La server pleacă valoarea exactă din listă, ex. „Costi (com. Vânători)” */}
            <input type="hidden" name={name} value={selected?.value ?? text.trim()} />

            {open && !loading && (
                // onMouseDown: un click în listă nu scoate cursorul din câmp înainte să alegem
                <div
                    onMouseDown={(event) => event.preventDefault()}
                    className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border bg-white text-sm shadow-lg"
                >
                    {filtered.length > 0 ? (
                        <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
                            {filtered.map((match, index) => (
                                <li
                                    key={match.option.value}
                                    id={`${listId}-${index}`}
                                    role="option"
                                    aria-selected={index === activeIndex}
                                    onClick={() => choose(match.option)}
                                    onMouseMove={() => setActive(index)}
                                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 ${
                                        index === activeIndex ? "bg-olive-light" : ""
                                    } ${match.option.value === selected?.value ? "font-medium" : ""}`}
                                >
                                    <span>
                                        <Highlight text={match.option.label} start={match.start} length={match.length} />
                                    </span>
                                    {match.option.tag && (
                                        <span className="shrink-0 text-xs text-neutral-500">{match.option.tag}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="px-3 py-2 text-neutral-500">{emptyText}</p>
                    )}
                </div>
            )}
        </div>
    );
}
