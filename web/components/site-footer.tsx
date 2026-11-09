import Image from "next/image";
import Link from "next/link";
import { ORGANIC_CERTIFICATE_PATH } from "@/lib/organic-certificate";
import { getShopInfo, phoneHref, type ShopInfo } from "@/lib/shop-info";
import { RETURN_FORM_LABEL, RETURN_FORM_PATH } from "@/lib/withdrawals";

// Subsolul, pe fiecare pagină. Aici stau lucrurile cerute de lege:
//   - datele de identificare ale firmei (legea comerțului electronic, 365/2002)
//   - formularul de retur, adică funcția de retragere din contract (OUG 18/2026)
//   - pictograma ANPC SAL, 250 × 50 px, cu link la reclamatiisal.anpc.ro (Ordinul ANPC 270/2026)

const infoLinks = [
    { href: ORGANIC_CERTIFICATE_PATH, label: "Certificatul bio" },
    { href: "/termeni", label: "Termeni și condiții" },
    { href: "/confidentialitate", label: "Politica de confidențialitate" },
    { href: "/contact", label: "Contact" },
    { href: "/cont", label: "Contul meu" },
];

const heading = "text-sm font-semibold uppercase tracking-wide text-white/70";

// Datele firmei vin din baza de date (le completezi din admin)
export async function SiteFooter() {
    const shop = await getShopInfo();
    return <FooterLayout shop={shop} />;
}

// Cât se încarcă datele firmei: același subsol, fără rândul cu datele firmei
export function SiteFooterFallback() {
    return <FooterLayout shop={null} />;
}

function FooterLayout({ shop }: { shop: ShopInfo | null }) {
    const identity = shop
        ? [
              shop.legalName,
              shop.cui && `CUI ${shop.cui}`,
              shop.regCom && `Nr. Reg. Com. ${shop.regCom}`,
              shop.registeredOffice && `Sediu: ${shop.registeredOffice}`,
          ].filter(Boolean)
        : [];

    return (
        <footer className="mt-auto bg-olive text-white print:hidden">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:gap-10 sm:px-8 sm:py-12 lg:grid-cols-4">
                <div>
                    {/* Soarele și numele decupate direct din logo, albe; soarele la jumătate din mărimea din etichetă */}
                    <Link href="/" className="inline-block" aria-label="Panos Greco, prima pagină">
                        <Image src="/logo-white.svg" alt="Panos Greco" width={324} height={189} className="h-auto w-40" />
                    </Link>
                    <p className="mt-4 max-w-xs text-sm text-white/80">
                        Ulei de măsline extravirgin bio, din livada proprie.
                    </p>
                </div>

                <nav aria-label="Retur">
                    <h2 className={heading}>Retur</h2>
                    <ul className="mt-3 space-y-2 text-sm">
                        {/* Legea cere ca formularul să fie vizibil și ușor de găsit, tot timpul */}
                        <li>
                            <Link href={RETURN_FORM_PATH} className="font-semibold underline underline-offset-4">
                                {RETURN_FORM_LABEL}
                            </Link>
                        </li>
                        <li>
                            <Link href="/retur" className="hover:underline">
                                14 zile drept de retur
                            </Link>
                        </li>
                    </ul>
                </nav>

                <nav aria-label="Informații">
                    <h2 className={heading}>Informații</h2>
                    <ul className="mt-3 space-y-2 text-sm">
                        {infoLinks.map((link) => (
                            <li key={link.href}>
                                <Link href={link.href} className="hover:underline">
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div>
                    <h2 className={heading}>Contact</h2>
                    <ul className="mt-3 space-y-2 text-sm">
                        {shop && (
                            <li>
                                <a href={`mailto:${shop.email}`} className="hover:underline">
                                    {shop.email}
                                </a>
                            </li>
                        )}
                        {shop?.phone && (
                            <li>
                                <a href={phoneHref(shop.phone)} className="hover:underline">
                                    {shop.phone}
                                </a>
                            </li>
                        )}
                        {shop?.shopAddress && <li className="text-white/80">{shop.shopAddress}</li>}
                        {shop?.openingHours && <li className="text-white/80">{shop.openingHours}</li>}
                    </ul>
                </div>
            </div>

            <div className="border-t border-white/20">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-8">
                    <p className="max-w-xl text-xs leading-relaxed text-white/80">{identity.join(" · ")}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer" className="hover:underline">
                            ANPC
                        </a>
                        {/* Imaginea oficială ANPC (201 × 50 px), centrată în caseta de 250 × 50 px cerută de ordin */}
                        <a
                            href="https://reclamatiisal.anpc.ro/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md bg-white"
                        >
                            <Image
                                src="/legal/anpc-sal.png"
                                alt="ANPC – Soluționarea alternativă a litigiilor (SAL)"
                                width={250}
                                height={50}
                                className="h-[50px] w-[250px] object-contain"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
