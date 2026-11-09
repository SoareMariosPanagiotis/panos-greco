import type { ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { Download, ExternalLink } from "lucide-react";
import { OrganicSeal } from "@/components/organic-seal";
import { buttonVariants } from "@/components/ui/button";
import { ORGANIC_CERTIFICATE as cert } from "@/lib/organic-certificate";

export const metadata: Metadata = {
    title: "Certificatul bio · Panos Greco",
    description:
        "Certificatul bio al uleiului de măsline extravirgin din livada familiei din Messinia, emis de DIO (GR-BIO-01) și publicat de Comisia Europeană.",
};

// Pagina certificatului bio, legată din sigla de pe pagina uleiului și din subsol.
// Datele de mai jos sunt copiate din certificat (lib/organic-certificate.ts). Originalul e public în
// TRACES, la Comisia Europeană: clientul nu trebuie să ne creadă pe cuvânt, îl poate verifica acolo.

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="text-neutral-800">{children}</dd>
        </div>
    );
}

type PageProps = { src: string; alt: string; caption: string; eager?: boolean };

// O pagină din certificat: apeși pe ea și se deschide mare, într-o filă nouă.
// Prima e vizibilă fără scroll pe ecranele mari, deci o încărcăm imediat (eager), nu leneș.
function CertificatePage({ src, alt, caption, eager = false }: PageProps) {
    return (
        <figure>
            <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md"
            >
                <Image
                    src={src}
                    alt={alt}
                    width={1240}
                    height={1753}
                    sizes="(min-width: 768px) 400px, 100vw"
                    loading={eager ? "eager" : undefined}
                    className="h-auto w-full"
                />
            </a>
            <figcaption className="mt-2 text-sm text-neutral-500">{caption}</figcaption>
        </figure>
    );
}

export default function OrganicCertificatePage() {
    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
            <h1 className="text-3xl font-bold text-olive">Certificatul bio al uleiului nostru</h1>
            <OrganicSeal isOrganic organicCode={cert.controlBodyCode} origin={cert.origin} />

            <div className="mt-6 max-w-2xl space-y-3 leading-relaxed text-neutral-700">
                <p>
                    Uleiul nostru vine din livada familiei din Messinia, Grecia. Livada și producția uleiului sunt
                    controlate de mulți ani de DIO, organism de control bio acreditat în Grecia.
                </p>
                <p>
                    Certificatul e emis prin TRACES, sistemul oficial al Comisiei Europene, unde e public. Îl poți
                    verifica oricând direct pe site-ul Comisiei.
                </p>
            </div>

            <dl className="mt-8 divide-y rounded-xl border bg-white px-6 text-sm">
                <Row label="Număr certificat">
                    <span className="font-medium">{cert.number}</span>
                </Row>
                <Row label="Producător">
                    {cert.operator}, {cert.place}
                </Row>
                <Row label="Organism de control">
                    {cert.controlBody} ({cert.controlBodyCode})
                </Row>
                <Row label="Produse certificate bio">{cert.products}</Row>
                <Row label="Activități certificate">{cert.activities}</Row>
                <Row label="Valabil">
                    {cert.validFrom} – {cert.validTo}
                </Row>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
                <a
                    href={cert.traces}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ className: "h-auto bg-olive px-4 py-2.5 text-white hover:bg-olive/90" })}
                >
                    Verifică pe site-ul Comisiei Europene
                    <ExternalLink />
                </a>
                <a
                    href={cert.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                        variant: "outline",
                        className: "h-auto border-olive px-4 py-2.5 text-olive hover:bg-olive hover:text-white",
                    })}
                >
                    Descarcă certificatul (PDF)
                    <Download />
                </a>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-2">
                <CertificatePage
                    src={cert.pages.english}
                    alt="Certificatul bio, prima pagină, în engleză"
                    caption="Prima pagină, în engleză. Apasă pe ea ca s-o vezi mare."
                    eager
                />
                <CertificatePage
                    src={cert.pages.greek}
                    alt="Certificatul bio, prima pagină, originalul în greacă"
                    caption="Originalul, în greacă, cu ștampila DIO."
                />
            </div>
        </main>
    );
}
