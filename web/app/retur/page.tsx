import { Suspense } from "react";
import type { Metadata } from "next";
import { Banknote, CalendarDays, PackageCheck, Truck } from "lucide-react";
import { LEGAL_UPDATED, LegalList, LegalSection, companySentence, legalLink } from "@/components/legal/legal-page";
import { ReturnSteps } from "@/components/returns/return-steps";
import { ReturnButton } from "@/components/returns/return-button";
import { getShopInfo } from "@/lib/shop-info";
import { CONFIRM_LABEL, RETURN_BUTTON_LABEL, RETURN_FORM_LABEL } from "@/lib/withdrawals";

export const metadata: Metadata = {
    title: "Politica de retur · Panos Greco",
    description: "Ai 14 zile să returnezi produsele, fără să ne spui de ce. Vezi pașii și cum îți primești banii înapoi.",
};

// Returul = dreptul de retragere din contract (OUG 34/2014, art. 9–18, modificată de OUG 18/2026).
// Sus, pe scurt și cu pașii; jos, regulile complete. Ciornă: înainte de lansare, citită de un jurist.

const FACTS = [
    { icon: CalendarDays, title: "14 zile", text: "de la primirea coletului, fără să ne spui de ce" },
    { icon: Banknote, title: "Banii înapoi", text: "în cel mult 14 zile, fără comisioane" },
    { icon: PackageCheck, title: "Produse sigilate", text: "alimentele desfăcute nu se pot returna" },
    { icon: Truck, title: "Transportul de retur", text: "îl plătești tu, cu orice curier" },
];

async function ReturnRules() {
    const shop = await getShopInfo();
    const returnAddress = shop.shopAddress ?? "adresa magazinului, pe care ți-o trimitem pe email";
    const mail = (
        <a href={`mailto:${shop.email}`} className={legalLink}>
            {shop.email}
        </a>
    );

    return (
        <div className="space-y-8 rounded-xl border bg-white p-6 text-[15px] leading-relaxed text-neutral-800 sm:p-8">
            <LegalSection title="Termenul de 14 zile">
                <p>
                    Te poți retrage din contract în 14 zile, fără să ne spui motivul și fără alte costuri decât
                    transportul de retur. Termenul curge din ziua în care tu, sau cineva ales de tine (altul decât
                    curierul), primești produsele. Dacă ai comandat mai multe produse livrate separat, termenul curge de
                    la primirea ultimului.
                </p>
                <p>
                    Dacă a 14-a zi pică sâmbătă, duminică sau într-o sărbătoare legală, termenul se încheie la sfârșitul
                    următoarei zile lucrătoare. Te poți retrage și înainte să primești comanda.
                </p>
            </LegalSection>

            <LegalSection id="cum" title="Cum ceri returul">
                <LegalList>
                    <li>
                        <strong>Online, cel mai simplu:</strong> din „{RETURN_FORM_LABEL}” (în subsolul fiecărei
                        pagini), cu butonul „{RETURN_BUTTON_LABEL}” de la comanda ta din cont sau din mailurile de
                        confirmare și de livrare. Confirmi numele, produsele și emailul, apoi apeși „{CONFIRM_LABEL}”.
                        Primești imediat pe email confirmarea, cu data și ora cererii.
                    </li>
                    <li>
                        <strong>Pe email</strong>, la {mail}, sau <strong>prin poștă</strong>, la {returnAddress}:
                        scrie-ne clar că te retragi din contract. Poți folosi modelul de formular de mai jos, dar nu
                        ești obligat.
                    </li>
                </LegalList>
                <p>Ești în termen dacă ne trimiți cererea înainte să se încheie cele 14 zile.</p>
            </LegalSection>

            <LegalSection title="Cum ne trimiți produsele">
                <p>
                    În cel mult 14 zile de la cerere, la adresa: <strong>{returnAddress}</strong>. Le poți trimite cu
                    orice curier sau le poți aduce în magazin. Costul transportului pentru retur e al tău. Dacă nu ai
                    primit încă coletul, îl poți refuza la livrare. Ambalează-le bine, ca să nu se deterioreze pe drum.
                </p>
                <p>
                    Răspunzi doar dacă produsele își pierd din valoare pentru că le-ai folosit altfel decât era nevoie
                    ca să vezi ce sunt.
                </p>
            </LegalSection>

            <LegalSection id="exceptii" title="Ce nu se poate returna">
                <p>Legea (art. 16 din OUG 34/2014) exceptează de la retur, printre altele:</p>
                <LegalList>
                    <li>
                        produsele sigilate care nu pot fi returnate din motive de protecție a sănătății sau de igienă și
                        care au fost desigilate după livrare. La noi, asta înseamnă alimentele desfăcute: sticle de ulei
                        deschise, pungi, cutii sau borcane cu sigiliul rupt;
                    </li>
                    <li>produsele care se pot deteriora sau care expiră rapid.</li>
                </LegalList>
            </LegalSection>

            <LegalSection title="Banii înapoi">
                <LegalList>
                    <li>
                        Îți returnăm toate sumele plătite pentru produsele returnate, în cel mult 14 zile de la data la
                        care ne-ai anunțat că te retragi.
                    </li>
                    <li>
                        Dacă returnezi toată comanda, îți returnăm și costul livrării standard (cea mai ieftină livrare
                        oferită de noi).
                    </li>
                    <li>
                        Putem amâna plata până primim produsele înapoi sau până ne trimiți dovada că le-ai expediat, care
                        vine prima.
                    </li>
                    <li>
                        Banii îi returnăm prin aceeași metodă cu care ai plătit. Pentru plata la livrare (ramburs), prin
                        transfer bancar, în contul IBAN pe care ni-l dai. Nu percepem niciun comision.
                    </li>
                </LegalList>
            </LegalSection>

            <LegalSection title="Dacă un produs are o problemă">
                <p>
                    Dacă primești un produs deteriorat, alterat sau altul decât cel comandat, nu e nevoie de retur pe
                    banii tăi: ai dreptul la garanția legală de conformitate, iar costurile sunt ale noastre. Scrie-ne la{" "}
                    {mail}, cu câteva poze, și găsim împreună soluția: înlocuire, reducere de preț sau banii înapoi.
                </p>
            </LegalSection>

            <LegalSection id="formular" title="Model de formular de retragere (pentru retur pe email sau prin poștă)">
                <p className="text-sm text-neutral-600">
                    (îl completezi și ni-l trimiți numai dacă vrei să ceri returul altfel decât cu formularul de pe
                    site)
                </p>
                <div className="space-y-2 rounded-lg border bg-neutral-50 p-4 text-sm">
                    <p>
                        – Către {companySentence(shop)}
                        {shop.shopAddress ? `, adresa: ${shop.shopAddress}` : ""}, email: {shop.email}:
                    </p>
                    <p>
                        – Vă informez prin prezenta cu privire la retragerea mea din contractul referitor la vânzarea
                        următoarelor produse: ……………………………
                    </p>
                    <p>– Comandate la data: …………… / primite la data: ……………</p>
                    <p>– Numărul comenzii: ……………</p>
                    <p>– Numele consumatorului: ……………………………</p>
                    <p>– Adresa consumatorului: ……………………………</p>
                    <p>– Semnătura consumatorului (doar dacă formularul e trimis pe hârtie): ……………</p>
                    <p>– Data: ……………</p>
                </div>
            </LegalSection>
        </div>
    );
}

export default function ReturnPolicyPage() {
    return (
        <main className="mx-auto w-full max-w-5xl space-y-12 px-8 py-10">
            {/* Sus: tot ce trebuie să știi, dintr-o privire */}
            <section className="rounded-2xl bg-white p-8 sm:p-10">
                <p className="text-sm font-semibold uppercase tracking-wide text-olive">Retur</p>
                <h1 className="mt-2 text-3xl font-bold text-olive sm:text-4xl">Te-ai răzgândit? Returnezi ușor.</h1>
                <p className="mt-3 max-w-2xl text-neutral-700">
                    Ai 14 zile de la primire să ne trimiți produsele înapoi, fără să ne spui de ce. În limbajul legii,
                    returul în 14 zile se numește „retragere din contract”.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                    <ReturnButton look="solid" label="Completează formularul de retur" />
                    <a href="#formular" className={legalLink}>
                        sau folosește formularul tipizat
                    </a>
                </div>

                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {FACTS.map((fact) => (
                        <li key={fact.title} className="rounded-xl bg-olive-light p-4">
                            <fact.icon className="size-6 text-olive" aria-hidden />
                            <p className="mt-2 font-semibold">{fact.title}</p>
                            <p className="text-sm text-neutral-600">{fact.text}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-olive">Cum returnezi, pas cu pas</h2>
                <div className="mt-4">
                    <ReturnSteps />
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-olive">Regulile complete</h2>
                <p className="mt-1 text-sm text-neutral-500">Ultima actualizare: {LEGAL_UPDATED}</p>
                <div className="mt-4">
                    <Suspense fallback={<p>Se încarcă...</p>}>
                        <ReturnRules />
                    </Suspense>
                </div>
            </section>
        </main>
    );
}
