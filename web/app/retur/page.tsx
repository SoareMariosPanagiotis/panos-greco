import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection, companySentence, legalLink } from "@/components/legal/legal-page";
import { getShopInfo } from "@/lib/shop-info";
import { CONFIRM_LABEL, WITHDRAW_LABEL } from "@/lib/withdrawals";

export const metadata: Metadata = {
    title: "Politica de retur · Panos Greco",
    description: "Cum te retragi din contract în 14 zile și cum îți primești banii înapoi.",
};

// Dreptul de retragere, după OUG 34/2014 (art. 9–18), cu modificările din OUG 18/2026.
// Ciornă: înainte de lansare, citită de un jurist.

async function ReturnPolicy() {
    const shop = await getShopInfo();
    const returnAddress = shop.shopAddress ?? "adresa magazinului, pe care ți-o trimitem pe email";

    return (
        <>
            <LegalSection title="Ai 14 zile să te răzgândești">
                <p>
                    Te poți retrage din contract în 14 zile, fără să ne spui motivul și fără alte costuri decât cele
                    scrise mai jos. Termenul curge din ziua în care tu, sau cineva ales de tine (altul decât curierul),
                    primești produsele. Dacă ai comandat mai multe produse livrate separat, termenul curge de la
                    primirea ultimului.
                </p>
                <p>
                    Dacă a 14-a zi pică sâmbătă, duminică sau într-o sărbătoare legală, termenul se încheie la sfârșitul
                    următoarei zile lucrătoare. Te poți retrage și înainte să primești comanda.
                </p>
            </LegalSection>

            <LegalSection id="cum" title="Cum te retragi">
                <LegalList>
                    <li>
                        <strong>Online, cel mai simplu:</strong> apasă{" "}
                        <Link href="/retragere" className={legalLink}>
                            {WITHDRAW_LABEL}
                        </Link>
                        . Butonul e în subsolul fiecărei pagini, la comanda ta din cont și în mailurile de confirmare și
                        de livrare. Confirmi numele, produsele și emailul, apoi apeși „{CONFIRM_LABEL}”. Îți trimitem
                        imediat pe email confirmarea de primire, cu data și ora cererii. Nu ai nevoie de cont.
                    </li>
                    <li>
                        <strong>Pe email</strong>, la{" "}
                        <a href={`mailto:${shop.email}`} className={legalLink}>
                            {shop.email}
                        </a>
                        , sau <strong>prin poștă</strong>, la {returnAddress}: scrie-ne clar că te retragi din contract.
                        Poți folosi modelul de formular de mai jos, dar nu ești obligat.
                    </li>
                </LegalList>
                <p>Ești în termen dacă ne trimiți cererea înainte să se încheie cele 14 zile.</p>
            </LegalSection>

            <LegalSection title="Cum ne trimiți produsele">
                <p>
                    Trimite-ne produsele în cel mult 14 zile de la cererea de retragere, la adresa: {returnAddress}. Le
                    poți trimite cu orice curier sau le poți aduce în magazin. <strong>Costul transportului pentru retur
                    e al tău.</strong> Dacă nu ai primit încă coletul, îl poți refuza la livrare.
                </p>
                <p>
                    Ambalează-le bine, ca să nu se deterioreze pe drum. Răspunzi doar dacă produsele își pierd din valoare
                    pentru că le-ai folosit altfel decât era nevoie ca să vezi ce sunt.
                </p>
            </LegalSection>

            <LegalSection id="exceptii" title="Ce produse nu pot fi returnate">
                <p>Legea (art. 16 din OUG 34/2014) exceptează de la dreptul de retragere, printre altele:</p>
                <LegalList>
                    <li>
                        produsele sigilate care nu pot fi returnate din motive de protecție a sănătății sau de igienă și
                        care au fost desigilate după livrare. La noi, asta înseamnă alimentele desfăcute: sticle de ulei
                        deschise, pungi, cutii sau borcane cu sigiliul rupt;
                    </li>
                    <li>produsele care se pot deteriora sau care expiră rapid.</li>
                </LegalList>
                <p>Așa că, dacă te gândești să returnezi ceva, păstrează produsul sigilat.</p>
            </LegalSection>

            <LegalSection title="Banii înapoi">
                <LegalList>
                    <li>
                        Îți returnăm toate sumele plătite pentru produsele returnate, în cel mult 14 zile de la data la
                        care ne-ai anunțat că te retragi.
                    </li>
                    <li>
                        Dacă te retragi din toată comanda, îți returnăm și costul livrării standard (cea mai ieftină
                        livrare oferită de noi).
                    </li>
                    <li>
                        Putem amâna plata până primim produsele înapoi sau până ne trimiți dovada că le-ai expediat, care
                        vine prima.
                    </li>
                    <li>
                        Banii îi returnăm prin aceeași metodă cu care ai plătit. Pentru plata la livrare (ramburs), prin
                        transfer bancar, în contul IBAN pe care ni-l dai. Nu percepem niciun comision pentru rambursare.
                    </li>
                </LegalList>
            </LegalSection>

            <LegalSection title="Dacă un produs are o problemă">
                <p>
                    Dacă primești un produs deteriorat, alterat sau altul decât cel comandat, nu e nevoie de retragere:
                    ai dreptul la garanția legală de conformitate, iar costurile sunt ale noastre. Scrie-ne la{" "}
                    <a href={`mailto:${shop.email}`} className={legalLink}>
                        {shop.email}
                    </a>
                    , cu câteva poze, și găsim împreună soluția: înlocuire, reducere de preț sau banii înapoi.
                </p>
            </LegalSection>

            <LegalSection id="formular" title="Model de formular de retragere">
                <p className="text-sm text-neutral-600">
                    (completează și trimite acest formular numai dacă vrei să te retragi din contract)
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
        </>
    );
}

export default function ReturnPolicyPage() {
    return (
        <LegalPage title="Politica de retur">
            <Suspense fallback={<p>Se încarcă...</p>}>
                <ReturnPolicy />
            </Suspense>
        </LegalPage>
    );
}
