import { Suspense } from "react";
import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection, companySentence, legalLink } from "@/components/legal/legal-page";
import { getShopInfo } from "@/lib/shop-info";

export const metadata: Metadata = {
    title: "Politica de confidențialitate · Panos Greco",
    description: "Ce date personale folosim, de ce, cât timp le păstrăm și ce drepturi ai.",
};

// După Regulamentul UE 2016/679 (GDPR) și Legea 506/2004 (cookie-uri).
// Descrie exact ce face aplicația azi; când adaugi ceva nou (plata cu cardul, statistici,
// newsletter), pagina trebuie actualizată. Ciornă: înainte de lansare, citită de un jurist.

async function Privacy() {
    const shop = await getShopInfo();
    const mail = (
        <a href={`mailto:${shop.email}`} className={legalLink}>
            {shop.email}
        </a>
    );

    return (
        <>
            <LegalSection title="Cine răspunde de datele tale">
                <p>
                    Operatorul datelor tale este {companySentence(shop)}. Pentru orice întrebare despre datele tale, ne
                    scrii la {mail}.
                </p>
            </LegalSection>

            <LegalSection title="Ce date folosim și de ce">
                <LegalList>
                    <li>
                        <strong>Comenzile:</strong> numele, emailul, telefonul, adresa de livrare, datele firmei (dacă
                        vrei factură pe firmă) și produsele comandate. Ne trebuie ca să livrăm comanda și să emitem
                        factura (executarea contractului și obligațiile legale de facturare și contabilitate).
                    </li>
                    <li>
                        <strong>Contul:</strong> emailul, parola, numele, telefonul și adresele salvate. Parola nu o
                        vedem niciodată: păstrăm doar o amprentă criptografică a ei. Contul e opțional și îl folosim
                        doar ca să comanzi mai ușor.
                    </li>
                    <li>
                        <strong>Mailurile:</strong> îți trimitem confirmarea comenzii, schimbările de stare, linkurile
                        pentru parolă nouă și pentru confirmarea emailului. Nu îți trimitem mesaje de marketing.
                    </li>
                    <li>
                        <strong>Returul (retragerea din contract):</strong> numele, emailul, produsele returnate, motivul (dacă ni-l
                        spui) și, opțional, IBAN-ul pentru rambursare. Le folosim ca să respectăm dreptul tău de
                        retur; IBAN-ul îl ștergem după ce îți returnăm banii.
                    </li>
                    <li>
                        <strong>Factura pe firmă:</strong> când cauți firma după CUI, trimitem CUI-ul la serviciul
                        public al ANAF, ca să completăm automat datele firmei.
                    </li>
                    <li>
                        <strong>Mesajele tale:</strong> când ne scrii, folosim datele din mesaj ca să îți răspundem.
                    </li>
                </LegalList>
            </LegalSection>

            <LegalSection title="Cui transmitem datele">
                <LegalList>
                    <li>firmei de curierat, doar ce trebuie pentru livrare: numele, telefonul și adresa;</li>
                    <li>
                        furnizorilor care ne țin site-ul și emailul pe servere; ei prelucrează datele doar pentru noi și
                        doar după instrucțiunile noastre;
                    </li>
                    <li>contabilității, pentru evidența facturilor;</li>
                    <li>autorităților, doar când legea ne obligă.</li>
                </LegalList>
                <p>Nu vindem și nu închiriem datele tale nimănui.</p>
            </LegalSection>

            <LegalSection title="Cât timp le păstrăm">
                <LegalList>
                    <li>comenzile și facturile: cât cer legile fiscale și contabile;</li>
                    <li>contul: până ne ceri să îl ștergem;</li>
                    <li>
                        linkurile trimise pe email: cel pentru parolă nouă expiră după o oră, cel pentru confirmarea
                        emailului după 48 de ore;
                    </li>
                    <li>IBAN-ul pentru retur: până îți returnăm banii.</li>
                </LegalList>
            </LegalSection>

            <LegalSection id="cookies" title="Cookie-uri și stocarea din browser">
                <p>Folosim doar ce e strict necesar ca site-ul să funcționeze:</p>
                <LegalList>
                    <li>
                        un cookie de autentificare (<code>panos_token</code>), doar dacă intri în cont; expiră după 7 zile
                        sau când ieși din cont;
                    </li>
                    <li>coșul de cumpărături, salvat în browserul tău (localStorage), ca să nu se piardă.</li>
                </LegalList>
                <p>
                    Nu folosim cookie-uri de statistică sau de publicitate, așa că nu îți cerem acordul pentru ele.
                    Dacă vom adăuga vreodată, îți vom cere acordul înainte.
                </p>
            </LegalSection>

            <LegalSection title="Drepturile tale">
                <p>
                    Ai dreptul să afli ce date avem despre tine, să le corectezi, să ceri ștergerea lor, să restricționezi
                    folosirea lor, să le primești într-un format pe care îl poți duce în altă parte și să te opui
                    prelucrării. Scrie-ne la {mail}; îți răspundem în cel mult o lună.
                </p>
                <p>
                    Dacă crezi că nu ți-am respectat drepturile, poți depune o plângere la Autoritatea Națională de
                    Supraveghere a Prelucrării Datelor cu Caracter Personal (
                    <a
                        href="https://www.dataprotection.ro"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={legalLink}
                    >
                        dataprotection.ro
                    </a>
                    ).
                </p>
            </LegalSection>

            <LegalSection title="Cum le protejăm">
                <p>
                    Conexiunea la site e criptată, parolele sunt păstrate doar ca amprente, iar fiecare parte a
                    aplicației are acces doar la datele de care are nevoie.
                </p>
            </LegalSection>
        </>
    );
}

export default function PrivacyPage() {
    return (
        <LegalPage title="Politica de confidențialitate">
            <Suspense fallback={<p>Se încarcă...</p>}>
                <Privacy />
            </Suspense>
        </LegalPage>
    );
}
