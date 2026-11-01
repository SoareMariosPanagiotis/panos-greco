"use server";

import { gql } from "@/lib/catalog";
import { COUNTIES } from "@/lib/counties";

// Codul poștal al unei adrese, ca să-l completăm în locul clientului (migrația 021).
//   - sat sau oraș mic: localitatea are un singur cod
//   - oraș mare sau București: codul depinde de stradă și de număr
// null = nu știm sigur. Atunci nu ghicim: clientul îl scrie el.

const localityQuery = `
  query LocalityPostalCode($county: String!, $label: String!) {
    allLocalities(condition: { county: $county, label: $label }) {
      nodes { siruta postalCode }
    }
  }
`;

const streetsQuery = `
  query StreetCodes($siruta: Int!, $words: [String]!) {
    streetCodes(localitySiruta: $siruta, addressWords: $words) {
      nodes { streetType streetWords numbers postalCode }
    }
  }
`;

type StreetRow = { streetType: string; streetWords: string[]; numbers: string | null; postalCode: string };

// Litere mici, fără diacritice, ca în nomenclator
const PLAIN: Record<string, string> = { ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t" };

function fold(text: string) {
    let out = "";
    for (const char of text.toLowerCase()) out += PLAIN[char] ?? char;
    return out;
}

// Prescurtările scrise de oameni → tipul de stradă din nomenclator
const TYPE_ALIASES: Record<string, string> = {
    str: "strada", strada: "strada",
    bd: "bulevard", bdul: "bulevard", blvd: "bulevard", bulevardul: "bulevard",
    al: "alee", aleea: "alee",
    calea: "cale",
    sos: "sosea", soseaua: "sosea",
    intr: "intrare", intrarea: "intrare",
    pta: "piata",
    spl: "splai", splaiul: "splai",
    drumul: "drum",
    fdt: "fundatura",
    prel: "prelungire", prelungirea: "prelungire",
    pasajul: "pasaj",
};
const STREET_TYPES = new Set(Object.values(TYPE_ALIASES).concat(["piata", "fundatura", "stradela"]));

// „Str. Brăilei, nr. 10, bl. A1” → ["strada", "brailei", "nr", "10", "bl", "a1"]
function addressWords(address: string) {
    const text = fold(address).replace(/b-dul/g, "bdul").replace(/p-ta/g, "pta");
    return text
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map((word) => TYPE_ALIASES[word] ?? word);
}

// Numerele de după „bl.”, „sc.”, „ap.”... nu sunt numărul casei
const NOT_HOUSE = new Set(["bl", "bloc", "sc", "scara", "ap", "apartament", "et", "etaj", "cam", "camera", "lot"]);

// Numărul casei: primul număr care nu face parte din numele străzii („1 Decembrie 1918”)
function houseNumber(words: string[], streetWords: string[]) {
    const left = [...streetWords];
    for (let i = 0; i < words.length; i++) {
        const used = left.indexOf(words[i]);
        if (used !== -1) {
            left.splice(used, 1);
            continue;
        }
        const match = /^(?:nr)?(\d+)[a-z]?$/.exec(words[i]);
        if (match && !NOT_HOUSE.has(words[i - 1] ?? "")) return Number(match[1]);
    }
    return null;
}

// Se potrivește numărul cu porțiunea de stradă? Exemple din nomenclator:
//   „nr. 1-13”       numerele impare de la 1 la 13 (o parte a străzii are impare, cealaltă pare)
//   „nr. 15; 2-44”   15 și numerele pare de la 2 la 44
//   „nr. 252-T”      de la 252 până la capătul străzii („T”), doar pare
//   null             toată strada are același cod
function matchesNumber(spec: string | null, house: number | null) {
    if (!spec) return true;
    const text = spec.toLowerCase();
    if (house === null || text.startsWith("bl")) return false; // pe blocuri nu știm să potrivim
    const parts = text.replace(/^nr\.?\s*/, "").replace(/\(.*?\)/g, "").split(/[;,]/);

    return parts.some((raw) => {
        const part = raw.trim();
        if (!part || part.includes("bis")) return false; // „200 bis” e altă adresă decât 200
        const range = /^(\d+)[a-z]*\s*-\s*(\d+|t)[a-z]*$/.exec(part);
        if (range) {
            const from = Number(range[1]);
            const to = range[2] === "t" ? Infinity : Number(range[2]);
            if (house < from || house > to) return false;
            const sameSide = to === Infinity || from % 2 === to % 2;
            return sameSide ? house % 2 === from % 2 : true;
        }
        const single = /^(\d+)[a-z]*$/.exec(part);
        return single !== null && Number(single[1]) === house;
    });
}

function pickCode(rows: StreetRow[], words: string[]) {
    if (rows.length === 0) return null;

    // 1. Strada cu cele mai multe cuvinte potrivite e cea mai precisă: „Mihai Viteazu” bate „Mihai”
    const most = Math.max(...rows.map((row) => row.streetWords.length));
    let candidates = rows.filter((row) => row.streetWords.length === most);

    // 2. Dacă adresa spune tipul (bd., aleea...), alegem după el între străzi cu același nume
    const type = words.find((word) => STREET_TYPES.has(word));
    if (type && candidates.some((row) => row.streetType === type)) {
        candidates = candidates.filter((row) => row.streetType === type);
    }

    // 3. Au rămas străzi diferite? Nu ghicim.
    if (new Set(candidates.map((row) => `${row.streetType} ${row.streetWords.join(" ")}`)).size > 1) return null;

    // 4. Numărul casei alege porțiunea de stradă
    const house = houseNumber(words, candidates[0].streetWords);
    const byNumber = new Set(candidates.filter((row) => matchesNumber(row.numbers, house)).map((row) => row.postalCode));
    if (byNumber.size === 1) return [...byNumber][0];

    // 5. Fără număr potrivit: e bine doar dacă toată strada are un singur cod
    const all = new Set(candidates.map((row) => row.postalCode));
    return all.size === 1 ? [...all][0] : null;
}

export async function findPostalCode(county: string, city: string, address: string): Promise<string | null> {
    if (!COUNTIES.includes(county) || !city) return null;

    try {
        const data = await gql<{ allLocalities: { nodes: { siruta: number; postalCode: string | null }[] } }>(
            localityQuery,
            { county, label: city },
        );
        const locality = data.allLocalities.nodes[0];
        if (!locality) return null;
        if (locality.postalCode) return locality.postalCode; // sat sau oraș mic

        const words = addressWords(address);
        if (words.length === 0) return null;
        const streets = await gql<{ streetCodes: { nodes: StreetRow[] } }>(streetsQuery, {
            siruta: locality.siruta,
            words,
        });
        return pickCode(streets.streetCodes.nodes, words);
    } catch {
        return null; // fără cod completat, clientul îl scrie el
    }
}
