"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";

// Informațiile de pe etichetă (migrația 025): textele stau pe produs,
// valorile nutriționale într-un tabel separat, salvat prin funcția save_product_nutrition

const TEXT_FIELDS = {
    ingredients: { label: "Ingredientele", max: 2000 },
    mayContain: { label: "„Poate conține”", max: 300 },
    storage: { label: "Condițiile de păstrare", max: 300 },
    usageNotes: { label: "Modul de folosire", max: 500 },
    origin: { label: "Țara de origine", max: 100 },
    producer: { label: "Producătorul", max: 300 },
    organicCode: { label: "Codul bio", max: 20 },
    labelNotes: { label: "Alte mențiuni", max: 1000 },
} as const;

// Valorile obligatorii din tabelul nutrițional (fibrele sunt opționale)
const NUTRIENTS = ["energyKj", "energyKcal", "fat", "saturates", "carbohydrate", "sugars", "protein", "salt"] as const;

type TextField = keyof typeof TEXT_FIELDS;
type Nutrient = (typeof NUTRIENTS)[number] | "fibre";

export type LabelValues = Record<TextField, string> & Record<Nutrient, string> & { basis: string };

export type LabelState = {
    status: "idle" | "saved" | "error";
    message: string;
    values?: LabelValues; // la eroare: ce ai scris, ca să nu scrii din nou
};

const UUID = /^[0-9a-f-]{36}$/i;
const NUMBER = /^\d{1,5}(\.\d{1,2})?$/; // 3378 sau 91.6 sau 0.01

function readValues(formData: FormData): LabelValues {
    const text = (name: string) => String(formData.get(name) ?? "").trim();
    // La cifre acceptăm și virgula: „91,6” devine „91.6”
    const number = (name: string) => text(name).replace(",", ".");
    return {
        ingredients: text("ingredients"),
        mayContain: text("mayContain"),
        storage: text("storage"),
        usageNotes: text("usageNotes"),
        origin: text("origin"),
        producer: text("producer"),
        organicCode: text("organicCode").toUpperCase(),
        labelNotes: text("labelNotes"),
        basis: text("basis") === "100 ml" ? "100 ml" : "100 g",
        energyKj: number("energyKj"),
        energyKcal: number("energyKcal"),
        fat: number("fat"),
        saturates: number("saturates"),
        carbohydrate: number("carbohydrate"),
        sugars: number("sugars"),
        fibre: number("fibre"),
        protein: number("protein"),
        salt: number("salt"),
    };
}

function validate(values: LabelValues) {
    for (const [name, rule] of Object.entries(TEXT_FIELDS)) {
        if (values[name as TextField].length > rule.max) return `${rule.label}: textul e prea lung (cel mult ${rule.max} de caractere).`;
    }
    if (values.organicCode && !/^[A-Z]{2}-\S{2,6}-\d{2,3}$/.test(values.organicCode)) {
        return "Codul bio arată ca pe etichetă, de exemplu RO-ECO-008 sau GR-BIO-01.";
    }

    // Tabelul nutrițional: ori complet, ori gol de tot
    const filled = NUTRIENTS.filter((name) => values[name] !== "");
    if (filled.length === 0 && values.fibre === "") return null;
    if (filled.length < NUTRIENTS.length) {
        return "Completează tot tabelul nutrițional (fibrele pot lipsi) sau lasă-l gol de tot.";
    }
    for (const name of [...NUTRIENTS, "fibre"] as const) {
        if (values[name] !== "" && !NUMBER.test(values[name])) return "Valorile nutriționale sunt numere, ex: 91,6.";
    }
    const amount = (name: Nutrient) => Number(values[name]);
    for (const name of ["fat", "saturates", "carbohydrate", "sugars", "protein", "salt", "fibre"] as const) {
        if (amount(name) > 100) return `Nu pot fi mai mult de 100 g la ${values.basis}.`;
    }
    if (amount("saturates") > amount("fat")) return "Grăsimile saturate nu pot fi mai multe decât grăsimile.";
    if (amount("sugars") > amount("carbohydrate")) return "Zaharurile nu pot fi mai multe decât glucidele.";
    return null;
}

const saveMutation = `
  mutation SaveProductLabel($id: UUID!, $patch: ProductPatch!, $nutrition: SaveProductNutritionInput!) {
    updateProductById(input: { id: $id, productPatch: $patch }) { product { id } }
    saveProductNutrition(input: $nutrition) { clientMutationId }
  }
`;

export async function saveProductLabel(_previous: LabelState, formData: FormData): Promise<LabelState> {
    const { token } = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const values = readValues(formData);
    if (!UUID.test(id)) return { status: "error", message: "Produs necunoscut.", values };

    const problem = validate(values);
    if (problem) return { status: "error", message: problem, values };

    // Gol înseamnă „nu e pe etichetă”: null, nu text gol
    const patch = Object.fromEntries(
        (Object.keys(TEXT_FIELDS) as TextField[]).map((name) => [name, values[name] || null]),
    );
    // Energia goală = fără tabel nutrițional: funcția șterge rândul
    const orNull = (name: Nutrient) => values[name] || null;
    const nutrition = {
        productId: id,
        basis: values.basis,
        energyKj: orNull("energyKj"),
        energyKcal: orNull("energyKcal"),
        fat: orNull("fat"),
        saturates: orNull("saturates"),
        carbohydrate: orNull("carbohydrate"),
        sugars: orNull("sugars"),
        protein: orNull("protein"),
        salt: orNull("salt"),
        fibre: orNull("fibre"),
    };

    try {
        await gql(saveMutation, { id, patch, nutrition }, token);
    } catch (error) {
        const message = (error as Error).message;
        return {
            status: "error",
            message: message.includes("permission denied")
                ? "Contul tău nu are voie să modifice produse."
                : `Nu am putut salva: ${message}`,
            values,
        };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Eticheta a fost salvată." };
}
