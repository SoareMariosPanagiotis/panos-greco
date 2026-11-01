import type { ReactNode } from "react";
import type { ShopInfo } from "@/lib/shop-info";

// Piesele comune ale paginilor legale: Termeni, Confidențialitate, Retur.
// Textele sunt o ciornă bună, scrisă după lege, dar înainte de lansare
// e bine să le citească un jurist.

// Data ultimei modificări a textelor: o schimbi când modifici o pagină
export const LEGAL_UPDATED = "1 noiembrie 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
    return (
        <main className="mx-auto w-full max-w-3xl px-8 py-10">
            <h1 className="text-3xl font-bold text-olive">{title}</h1>
            <p className="mt-2 text-sm text-neutral-500">Ultima actualizare: {LEGAL_UPDATED}</p>
            <div className="mt-8 space-y-8 rounded-xl border bg-white p-6 text-[15px] leading-relaxed text-neutral-800 sm:p-8">
                {children}
            </div>
        </main>
    );
}

export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
    return (
        <section id={id} className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold text-olive">{title}</h2>
            {children}
        </section>
    );
}

export function LegalList({ children }: { children: ReactNode }) {
    return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

// „PANOS GRECO S.R.L., cu sediul în …, CUI …, nr. de ordine în Registrul Comerțului …”
export function companySentence(shop: ShopInfo) {
    const parts = [shop.legalName];
    if (shop.registeredOffice) parts.push(`cu sediul în ${shop.registeredOffice}`);
    if (shop.cui) parts.push(`CUI ${shop.cui}`);
    if (shop.regCom) parts.push(`nr. de ordine în Registrul Comerțului ${shop.regCom}`);
    return parts.join(", ");
}

// Linkurile din texte au același stil peste tot
export const legalLink = "font-medium text-olive underline underline-offset-2";
