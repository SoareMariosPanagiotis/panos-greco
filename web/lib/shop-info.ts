import { cache } from "react";
import { gql } from "@/lib/catalog";

// Datele firmei (migrația 023). Le completezi din admin, la „Datele firmei”,
// și apar în subsol, la Contact, în Termeni și în mailuri.
export type ShopInfo = {
    legalName: string;
    cui: string | null;
    regCom: string | null;
    registeredOffice: string | null;
    shopAddress: string | null;
    openingHours: string | null;
    email: string;
    phone: string | null;
    facebookUrl: string | null; // migrația 036
    instagramUrl: string | null;
    mapsUrl: string | null; // locul magazinului pe Google Maps
};

export const SHOP_INFO_FIELDS = `legalName cui regCom registeredOffice shopAddress openingHours email phone facebookUrl instagramUrl mapsUrl`;

const shopInfoQuery = `query ShopInfo { shopInfoById(id: true) { ${SHOP_INFO_FIELDS} } }`;

// Dacă API-ul nu răspunde, subsolul și paginile se afișează oricum, cu ce știm sigur
const FALLBACK: ShopInfo = {
    legalName: "PANOS GRECO S.R.L.",
    cui: null,
    regCom: null,
    registeredOffice: null,
    shopAddress: null,
    openingHours: null,
    email: "office@panos-greco.com",
    phone: null,
    facebookUrl: null,
    instagramUrl: null,
    mapsUrl: null,
};

// cache() = în timpul aceleiași cereri întrebăm API-ul o singură dată,
// chiar dacă și subsolul, și pagina au nevoie de date
export const getShopInfo = cache(async (): Promise<ShopInfo> => {
    try {
        const data = await gql<{ shopInfoById: ShopInfo | null }>(shopInfoQuery);
        return data.shopInfoById ?? FALLBACK;
    } catch {
        return FALLBACK;
    }
});

// Ce lipsește ca datele de identificare să fie complete (le cere legea comerțului electronic)
export function missingShopInfo(info: ShopInfo) {
    const missing: string[] = [];
    if (!info.cui) missing.push("CUI");
    if (!info.regCom) missing.push("nr. Registrul Comerțului");
    if (!info.registeredOffice) missing.push("sediul social");
    if (!info.shopAddress) missing.push("adresa magazinului");
    if (!info.phone) missing.push("telefonul");
    return missing;
}

// Linkul spre magazin pe hartă: cel pus în admin; dacă lipsește, o căutare pe Google Maps după adresa magazinului
// (merge, dar duce la adresă, nu la „fișa” magazinului cu poze și program).
export function mapsHref(info: ShopInfo) {
    if (info.mapsUrl) return info.mapsUrl;
    if (info.shopAddress) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.shopAddress)}`;
    return null;
}

// „0740 123 456” → „+40740123456”, pentru linkurile tel:
export function phoneHref(phone: string) {
    const digits = phone.replace(/\s+/g, "");
    return `tel:${digits.startsWith("0") ? `+4${digits}` : digits}`;
}
