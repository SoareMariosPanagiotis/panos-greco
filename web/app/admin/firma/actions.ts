"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";

// Datele firmei (migrația 023): apar în subsol, la Contact, în Termeni și în mailuri

export type ShopInfoValues = {
    legalName: string;
    cui: string;
    regCom: string;
    registeredOffice: string;
    shopAddress: string;
    openingHours: string;
    email: string;
    phone: string;
    facebookUrl: string;
    instagramUrl: string;
    mapsUrl: string;
};

export type ShopInfoState = {
    status: "idle" | "saved" | "error";
    message: string;
    values?: ShopInfoValues; // la eroare: ce ai scris, ca să nu scrii din nou
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Aceleași adrese acceptate ca în baza de date (migrația 036): doar https, doar de pe aceste site-uri
const FACEBOOK = /^https:\/\/(www\.|m\.)?(facebook|fb)\.com\//;
const INSTAGRAM = /^https:\/\/(www\.)?instagram\.com\//;
const MAPS = /^https:\/\/((www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?\/maps|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?\/|maps\.app\.goo\.gl\/|goo\.gl\/maps\/)/;

function readValues(formData: FormData): ShopInfoValues {
    const text = (name: string) => String(formData.get(name) ?? "").trim();
    return {
        legalName: text("legalName"),
        cui: text("cui").replace(/\s+/g, "").toUpperCase(),
        regCom: text("regCom").toUpperCase(),
        registeredOffice: text("registeredOffice"),
        shopAddress: text("shopAddress"),
        openingHours: text("openingHours"),
        email: text("email").toLowerCase(),
        phone: text("phone").replace(/\s+/g, " "),
        facebookUrl: text("facebookUrl"),
        instagramUrl: text("instagramUrl"),
        mapsUrl: text("mapsUrl"),
    };
}

// Aceleași reguli ca în baza de date, dar cu mesaje pe înțelesul tău
function validate(values: ShopInfoValues) {
    if (values.legalName.length < 2 || values.legalName.length > 120) return "Scrie denumirea firmei.";
    if (values.cui && !/^(RO)?\d{2,10}$/.test(values.cui)) return "CUI-ul are doar cifre, cu sau fără RO în față.";
    if (values.regCom && (values.regCom.length < 3 || values.regCom.length > 40)) {
        return "Numărul de la Registrul Comerțului nu pare corect.";
    }
    if (values.registeredOffice.length > 300 || values.shopAddress.length > 300) return "Adresa e prea lungă.";
    if (values.openingHours.length > 200) return "Programul e prea lung (cel mult 200 de caractere).";
    if (!EMAIL.test(values.email)) return "Scrie o adresă de email validă.";
    if (values.phone && !/^\+?[0-9 ]{9,16}$/.test(values.phone)) return "Telefonul are doar cifre, ex: 0740 123 456.";
    if (values.facebookUrl && (!FACEBOOK.test(values.facebookUrl) || values.facebookUrl.length > 300)) {
        return "Linkul de Facebook trebuie să înceapă cu https://www.facebook.com/";
    }
    if (values.instagramUrl && (!INSTAGRAM.test(values.instagramUrl) || values.instagramUrl.length > 300)) {
        return "Linkul de Instagram trebuie să înceapă cu https://www.instagram.com/";
    }
    if (values.mapsUrl && (!MAPS.test(values.mapsUrl) || values.mapsUrl.length > 500)) {
        return "Linkul de Google Maps trebuie să fie de la Google Maps (de ex. https://maps.app.goo.gl/…).";
    }
    return null;
}

const updateMutation = `
  mutation UpdateShopInfo($patch: ShopInfoPatch!) {
    updateShopInfoById(input: { id: true, shopInfoPatch: $patch }) {
      shopInfo { legalName }
    }
  }
`;

export async function updateShopInfo(_previous: ShopInfoState, formData: FormData): Promise<ShopInfoState> {
    const { token } = await requireAdmin();

    const values = readValues(formData);
    const problem = validate(values);
    if (problem) return { status: "error", message: problem, values };

    // Câmpurile goale devin null: „necompletat”, nu „text gol”
    const patch = {
        legalName: values.legalName,
        cui: values.cui || null,
        regCom: values.regCom || null,
        registeredOffice: values.registeredOffice || null,
        shopAddress: values.shopAddress || null,
        openingHours: values.openingHours || null,
        email: values.email,
        phone: values.phone || null,
        facebookUrl: values.facebookUrl || null,
        instagramUrl: values.instagramUrl || null,
        mapsUrl: values.mapsUrl || null,
    };

    try {
        await gql(updateMutation, { patch }, token);
    } catch (error) {
        const message = (error as Error).message;
        return {
            status: "error",
            message: message.includes("permission denied") ? "Contul tău nu are voie să modifice datele firmei." : message,
            values,
        };
    }

    // Subsolul, Contactul și Termenii se reîncarcă peste tot
    revalidatePath("/", "layout");
    return { status: "saved", message: "Datele firmei au fost salvate." };
}
