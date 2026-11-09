// Certificatul bio al livezii din Messinia (Regulamentul (UE) 2018/848, art. 35).
// Îl emite DIO (GR-BIO-01) prin TRACES, sistemul Comisiei Europene, unde e public: de aceea pe site
// îl arătăm întreg, cu numele și localitatea producătorului, și trimitem clientul să-l verifice acolo.
// Se reînnoiește periodic. Când vine cel nou: pui PDF-ul și pozele noi în web/public/bio/ și schimbi
// datele de aici (numărul, valabilitatea, linkul TRACES din subsolul certificatului).
export const ORGANIC_CERTIFICATE = {
    number: "GR-BIO-01.300-0080706.2026.001",
    operator: "Soare Toader",
    place: "Chora Trifillias, Messinia (Grecia)",
    controlBody: "DIO – Inspection and Certification Organisation of Organic Products, Atena",
    controlBodyCode: "GR-BIO-01",
    origin: "Grecia",
    products: "Măsline; ulei de măsline extravirgin și virgin",
    activities: "Producție, depozitare, punere pe piață",
    validFrom: "28.09.2026",
    validTo: "27.09.2027",
    pdf: "/bio/certificat-bio-2026.pdf",
    pages: {
        english: "/bio/certificat-bio-2026-engleza.jpg",
        greek: "/bio/certificat-bio-2026-greaca.jpg",
    },
    traces: "https://webgate.ec.europa.eu/tracesnt/directory/publication/organic-operator/GR-BIO-01.300-0080706.2026.001.pdf",
} as const;

export const ORGANIC_CERTIFICATE_PATH = "/certificat-bio";

// Certificatul acoperă doar uleiul din livada noastră. Alt produs bio are alt producător și alt
// certificat, chiar dacă e controlat tot de DIO: acolo linkul nu are voie să apară.
const CERTIFIED_SLUGS = new Set(["ulei-de-masline-extravirgin-bio"]);

// Linkul apare doar dacă și codul din admin e cel din certificat: sigla și certificatul spun același lucru
export function certificateLinkFor(slug: string, organicCode: string | null) {
    return CERTIFIED_SLUGS.has(slug) && organicCode === ORGANIC_CERTIFICATE.controlBodyCode
        ? ORGANIC_CERTIFICATE_PATH
        : undefined;
}
