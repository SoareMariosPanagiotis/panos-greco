import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection, companySentence, legalLink } from "@/components/legal/legal-page";
import { getShopInfo } from "@/lib/shop-info";
import { RETURN_BUTTON_LABEL, RETURN_FORM_LABEL, RETURN_FORM_PATH } from "@/lib/withdrawals";

export const metadata: Metadata = {
    title: "Termeni și condiții · Panos Greco",
    description: "Regulile magazinului online Panos Greco: comenzi, plată, livrare, retur și garanții.",
};

// Termenii magazinului, după legea comerțului electronic (365/2002), OUG 34/2014 (contractele
// la distanță) și OUG 140/2021 (garanția de conformitate). Ciornă: înainte de lansare, citită de un jurist.

async function Terms() {
    const shop = await getShopInfo();

    return (
        <>
            <LegalSection title="1. Cine suntem">
                <p>
                    Magazinul online Panos Greco este administrat de {companySentence(shop)}. Ne poți scrie la{" "}
                    <a href={`mailto:${shop.email}`} className={legalLink}>
                        {shop.email}
                    </a>
                    {shop.phone ? ` sau ne poți suna la ${shop.phone}` : ""}. Toate datele de contact sunt pe pagina{" "}
                    <Link href="/contact" className={legalLink}>
                        Contact
                    </Link>
                    .
                </p>
                <p>
                    Termenii de mai jos se aplică tuturor comenzilor plasate pe acest site. Când plasezi o comandă, îi
                    accepți. Îi poți salva sau tipări oricând de pe această pagină.
                </p>
            </LegalSection>

            <LegalSection title="2. Contul tău">
                <p>
                    Poți comanda și fără cont. Contul îți păstrează comenzile, adresele și datele de contact, ca să
                    comanzi mai repede. Ai grijă de parolă: nu o da nimănui. Poți cere oricând ștergerea contului,
                    scriindu-ne pe email.
                </p>
            </LegalSection>

            <LegalSection title="3. Prețuri și comanda">
                <LegalList>
                    <li>Prețurile sunt în lei și includ TVA. Costul livrării îl vezi în coș, înainte să plasezi comanda.</li>
                    <li>
                        După ce plasezi comanda, primești pe email confirmarea că am primit-o. Contractul se încheie
                        când îți confirmăm comanda, prin mailul „Comanda ta e confirmată”.
                    </li>
                    <li>
                        Putem refuza o comandă doar dintr-un motiv întemeiat, de exemplu dacă produsul nu mai e în stoc
                        sau datele de livrare sunt incomplete. Te anunțăm imediat și, dacă ai plătit deja, îți returnăm
                        banii.
                    </li>
                    <li>
                        Pozele sunt orientative. Informațiile despre fiecare produs (ingrediente, alergeni, valori
                        nutriționale, mod de păstrare) sunt pe pagina lui și pe etichetă.
                    </li>
                </LegalList>
            </LegalSection>

            <LegalSection title="4. Plata și factura">
                <p>
                    Acum se plătește la livrare (ramburs): când primești coletul sau când ridici comanda din magazin.
                    Pentru fiecare comandă emitem factură. Dacă vrei factura pe firmă, completează datele firmei când
                    plasezi comanda.
                </p>
            </LegalSection>

            <LegalSection title="5. Livrarea">
                <LegalList>
                    <li>
                        Livrăm doar în România: prin curier, gratuit la adresa ta din Galați sau cu ridicare gratuită din
                        magazinul nostru. Costul și pragul de livrare gratuită le vezi în coș.
                    </li>
                    <li>
                        Prin curier, coletul ajunge de obicei în 1–3 zile lucrătoare de la expediere. Dacă nu putem
                        livra în cel mult 30 de zile de la încheierea contractului, te anunțăm și poți renunța la
                        comandă, cu banii înapoi.
                    </li>
                    <li>
                        Riscul ca produsele să se piardă sau să se deterioreze trece la tine din momentul în care
                        primești coletul. Verifică-l la primire; dacă e deteriorat, spune-i curierului și scrie-ne.
                    </li>
                </LegalList>
            </LegalSection>

            <LegalSection title="6. Dreptul de retur (retragerea din contract)">
                <p>
                    Ca și consumator, poți returna produsele în 14 zile de la primire, fără să ne spui motivul. În
                    limbajul legii, asta se numește retragere din contract. Ceri returul din{" "}
                    <Link href={RETURN_FORM_PATH} className={legalLink}>
                        {RETURN_FORM_LABEL}
                    </Link>{" "}
                    (în subsolul site-ului), cu butonul „{RETURN_BUTTON_LABEL}” din contul tău sau din mailurile
                    noastre. Costul transportului pentru retur e al tău. Alimentele desigilate după livrare nu pot fi
                    returnate, din motive de igienă. Toate detaliile sunt în{" "}
                    <Link href="/retur" className={legalLink}>
                        Politica de retur
                    </Link>
                    .
                </p>
            </LegalSection>

            <LegalSection title="7. Garanția legală de conformitate">
                <p>
                    Răspundem pentru orice lipsă de conformitate care există la livrare (OUG 140/2021): dacă un produs
                    ajunge deteriorat, alterat sau nu e cel comandat, ai dreptul să îl înlocuim, să reducem prețul sau
                    să îți returnăm banii. Scrie-ne cât mai repede, cu câteva poze. Pentru alimente, verifică și data
                    de valabilitate de pe ambalaj.
                </p>
            </LegalSection>

            <LegalSection title="8. Reclamații">
                <p>
                    Pentru orice nemulțumire, scrie-ne la{" "}
                    <a href={`mailto:${shop.email}`} className={legalLink}>
                        {shop.email}
                    </a>
                    . Dacă nu găsim împreună o soluție, te poți adresa Autorității Naționale pentru Protecția
                    Consumatorilor (
                    <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer" className={legalLink}>
                        anpc.ro
                    </a>
                    ) sau poți folosi soluționarea alternativă a litigiilor (SAL), pe platforma{" "}
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
            </LegalSection>

            <LegalSection title="9. Datele tale personale">
                <p>
                    Folosim datele tale doar ca să îți livrăm comenzile și să ținem legătura cu tine. Detaliile sunt în{" "}
                    <Link href="/confidentialitate" className={legalLink}>
                        Politica de confidențialitate
                    </Link>
                    .
                </p>
            </LegalSection>

            <LegalSection title="10. Conținutul site-ului">
                <p>
                    Textele, pozele, logoul și designul site-ului ne aparțin. Nu le folosi în alte scopuri fără acordul
                    nostru scris.
                </p>
            </LegalSection>

            <LegalSection title="11. Legea aplicabilă și modificări">
                <p>
                    Acești termeni sunt guvernați de legea română. Încercăm să rezolvăm orice neînțelegere pe cale
                    amiabilă; altfel, se ocupă instanțele competente din România. Putem actualiza termenii; fiecărei
                    comenzi i se aplică varianta în vigoare în ziua în care a fost plasată.
                </p>
            </LegalSection>
        </>
    );
}

export default function TermsPage() {
    return (
        <LegalPage title="Termeni și condiții">
            <Suspense fallback={<p>Se încarcă...</p>}>
                <Terms />
            </Suspense>
        </LegalPage>
    );
}
