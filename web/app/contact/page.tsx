import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { legalLink } from "@/components/legal/legal-page";
import { getShopInfo, phoneHref } from "@/lib/shop-info";
import { RETURN_FORM_LABEL, RETURN_FORM_PATH } from "@/lib/withdrawals";

export const metadata: Metadata = {
    title: "Contact · Panos Greco",
    description: "Datele firmei, adresa magazinului din Galați, emailul și telefonul Panos Greco.",
};

// Datele de identificare cerute de legea comerțului electronic (365/2002, art. 5),
// toate într-un singur loc. Vin din „Datele firmei” din admin.

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid gap-1 py-3 sm:grid-cols-[200px_1fr]">
            <dt className="text-neutral-500">{label}</dt>
            <dd>{children}</dd>
        </div>
    );
}

async function ContactDetails() {
    const shop = await getShopInfo();

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border bg-white p-6">
                <h2 className="text-lg font-semibold">Scrie-ne sau sună-ne</h2>
                <dl className="mt-2 divide-y text-sm">
                    <Row label="Email">
                        <a href={`mailto:${shop.email}`} className={legalLink}>
                            {shop.email}
                        </a>
                    </Row>
                    {shop.phone && (
                        <Row label="Telefon">
                            <a href={phoneHref(shop.phone)} className={legalLink}>
                                {shop.phone}
                            </a>
                        </Row>
                    )}
                    {shop.shopAddress && <Row label="Magazinul">{shop.shopAddress}</Row>}
                    {shop.openingHours && <Row label="Program">{shop.openingHours}</Row>}
                </dl>
            </section>

            <section className="rounded-xl border bg-white p-6">
                <h2 className="text-lg font-semibold">Datele firmei</h2>
                <dl className="mt-2 divide-y text-sm">
                    <Row label="Denumire">{shop.legalName}</Row>
                    {shop.cui && <Row label="CUI">{shop.cui}</Row>}
                    {shop.regCom && <Row label="Nr. Registrul Comerțului">{shop.regCom}</Row>}
                    {shop.registeredOffice && <Row label="Sediul social">{shop.registeredOffice}</Row>}
                </dl>
            </section>

            <section className="rounded-xl border bg-white p-6 text-sm md:col-span-2">
                <h2 className="text-lg font-semibold">Retururi și reclamații</h2>
                <p className="mt-2 text-neutral-700">
                    Te-ai răzgândit? Ai 14 zile de la primire:{" "}
                    <Link href={RETURN_FORM_PATH} className={legalLink}>
                        {RETURN_FORM_LABEL}
                    </Link>
                    . Detalii în{" "}
                    <Link href="/retur" className={legalLink}>
                        Politica de retur
                    </Link>
                    .
                </p>
                <p className="mt-2 text-neutral-700">
                    Dacă nu găsim împreună o soluție, te poți adresa ANPC, prin platforma de soluționare alternativă a
                    litigiilor:{" "}
                    <a
                        href="https://reclamatiisal.anpc.ro/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={legalLink}
                    >
                        reclamatiisal.anpc.ro
                    </a>
                    .
                </p>
            </section>
        </div>
    );
}

export default function ContactPage() {
    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
            <h1 className="text-3xl font-bold text-olive">Contact</h1>
            <p className="mt-2 text-neutral-700">Ai o întrebare despre o comandă sau despre produse? Îți răspundem cu drag.</p>
            <div className="mt-8">
                <Suspense fallback={<p>Se încarcă...</p>}>
                    <ContactDetails />
                </Suspense>
            </div>
        </main>
    );
}
