// Datele publice ale unei firme, de la ANAF: serviciul web gratuit „verificare plătitori de TVA”.
// Merge doar de pe server: ANAF nu răspunde cererilor venite direct din browser.
// Limită ANAF: o cerere pe secundă. La noi pleacă una doar când clientul apasă „Caută”.

const ANAF_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

export type Company = {
    cui: string; // „RO12345678” dacă firma e plătitoare de TVA, altfel „12345678”
    name: string;
    regNo: string; // Nr. Reg. Com., ex. „J17/123/2020”
    address: string; // adresa sediului social, cum o are ANAF
    vatPayer: boolean;
    inactive: boolean; // ANAF o arată ca inactivă fiscal
};

// „RO 123 456” → „123456”: doar cifrele, fără RO și fără spații
export function cuiDigits(input: string) {
    return input.toUpperCase().replace(/\s/g, "").replace(/^RO/, "");
}

// Ultima cifră a unui CUI e o cifră de control, calculată din celelalte cu cheia 753217532.
// O greșeală de tastare aproape sigur strică potrivirea, așa că o prindem înainte să întrebăm ANAF.
export function isValidCui(digits: string) {
    if (!/^\d{2,10}$/.test(digits)) return false;
    const key = "753217532";
    const body = digits.slice(0, -1).padStart(9, "0");
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(body[i]) * Number(key[i]);
    const control = ((sum * 10) % 11) % 10; // restul 10 devine 0
    return control === Number(digits.at(-1));
}

type AnafFound = {
    date_generale?: { denumire?: string; adresa?: string; nrRegCom?: string };
    inregistrare_scop_Tva?: { scpTVA?: boolean };
    stare_inactiv?: { statusInactivi?: boolean };
};

// null = ANAF nu cunoaște CUI-ul. Aruncă eroare dacă ANAF nu răspunde.
export async function findCompany(digits: string): Promise<Company | null> {
    // Data de azi, „2026-11-01”: formatul suedez (sv-SE) e chiar formatul cerut de ANAF
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" });

    const response = await fetch(ANAF_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ cui: Number(digits), data: today }]),
        signal: AbortSignal.timeout(8000), // nu-l lăsăm pe client să aștepte la nesfârșit
        cache: "no-store",
    });
    if (!response.ok) throw new Error(`ANAF a răspuns cu ${response.status}`);

    const json = (await response.json()) as { found?: AnafFound[] };
    const found = json.found?.[0];
    if (!found) return null;

    const general = found.date_generale ?? {};
    const vatPayer = found.inregistrare_scop_Tva?.scpTVA === true;

    return {
        cui: `${vatPayer ? "RO" : ""}${digits}`,
        name: (general.denumire ?? "").trim(),
        regNo: (general.nrRegCom ?? "").trim(),
        address: (general.adresa ?? "").trim(),
        vatPayer,
        inactive: found.stare_inactiv?.statusInactivi === true,
    };
}
