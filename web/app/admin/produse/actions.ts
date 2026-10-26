"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gql } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

// ---------- Reguli comune ----------

const PRICE = /^\d+(\.\d{1,2})?$/; // 25 sau 25.50
const WHOLE = /^\d+$/; // număr întreg, de la 0 în sus
const VAT = /^\d{1,2}(\.\d{1,2})?$/; // 11 sau 21
const BARCODE = /^\d{8,14}$/; // cod EAN: doar cifre

// Traduce erorile din Postgres în mesaje pe înțelesul omului
function friendlyError(message: string) {
    if (message.includes("duplicate key")) {
        if (message.includes("barcode")) return "Codul de bare există deja la alt produs.";
        if (message.includes("slug")) return "Există deja un produs cu un nume asemănător.";
        if (message.includes("pack_size")) return "Produsul are deja această mărime.";
        return "Există deja o înregistrare cu aceste date.";
    }
    if (message.includes("foreign key")) {
        return "Mărimea apare în comenzi și nu poate fi ștearsă.";
    }
    return `Nu am putut salva: ${message}`;
}

export type VariantValues = {
    packSize: string;
    packUnit: string;
    price: string;
    stock: string;
    barcode: string;
};

function readVariant(formData: FormData): VariantValues {
    return {
        packSize: String(formData.get("packSize") ?? "").trim(),
        packUnit: String(formData.get("packUnit") ?? ""),
        price: String(formData.get("price") ?? "").trim().replace(",", "."),
        stock: String(formData.get("stock") ?? "").trim() || "0",
        barcode: String(formData.get("barcode") ?? "").trim(),
    };
}

function validateVariant(values: VariantValues) {
    if (!WHOLE.test(values.packSize) || Number(values.packSize) === 0) {
        return "Mărimea trebuie să fie un număr întreg mai mare ca 0. Exemplu: 500";
    }
    if (values.packUnit !== "g" && values.packUnit !== "ml") {
        return "Unitatea trebuie să fie g sau ml.";
    }
    if (!PRICE.test(values.price)) return "Preț invalid. Exemplu: 25 sau 25.50";
    if (!WHOLE.test(values.stock)) return "Stocul trebuie să fie un număr întreg, de la 0 în sus.";
    if (values.barcode && !BARCODE.test(values.barcode)) {
        return "Codul de bare are doar cifre (între 8 și 14).";
    }
    return null;
}

function variantForApi(values: VariantValues) {
    return {
        packSize: Number(values.packSize),
        packUnit: values.packUnit,
        price: values.price,
        stock: Number(values.stock),
        barcode: values.barcode || null,
    };
}

// ---------- Mărimi: preț și stoc ----------

export type VariantFormState = {
    status: "idle" | "saved" | "error";
    message: string;
    price?: string;
    stock?: string;
};

const updateVariantMutation = `
  mutation UpdateVariant($id: UUID!, $price: BigFloat!, $stock: Int!) {
    updateProductVariantById(
      input: { id: $id, productVariantPatch: { price: $price, stock: $stock } }
    ) {
      productVariant { id price stock }
    }
  }
`;

export async function updateVariant(
    _previous: VariantFormState,
    formData: FormData,
): Promise<VariantFormState> {
    // Prima încuietoare: oricine poate apela această funcție, deci verificăm cine e
    const { token } = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const price = String(formData.get("price") ?? "").trim().replace(",", ".");
    const stock = String(formData.get("stock") ?? "").trim();

    if (!PRICE.test(price)) {
        return { status: "error", message: "Preț invalid. Exemplu: 25 sau 25.50", price, stock };
    }
    if (!WHOLE.test(stock)) {
        return { status: "error", message: "Stocul trebuie să fie un număr întreg, de la 0 în sus.", price, stock };
    }

    try {
        // A doua încuietoare: Postgres acceptă modificarea doar cu biletul de admin
        await gql(updateVariantMutation, { id, price, stock: Number(stock) }, token);
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message), price, stock };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Salvat" };
}

// ---------- Detaliile produsului ----------

export type ProductFormValues = {
    name: string;
    description: string;
    categoryId: string;
    vatRate: string;
    isOrganic: boolean;
    isActive: boolean;
};

export type ProductFormState = {
    status: "idle" | "saved" | "error";
    message: string;
    values?: ProductFormValues;
};

const updateProductMutation = `
  mutation UpdateProduct($id: UUID!, $patch: ProductPatch!) {
    updateProductById(input: { id: $id, productPatch: $patch }) {
      product { id }
    }
  }
`;

export async function updateProduct(
    _previous: ProductFormState,
    formData: FormData,
): Promise<ProductFormState> {
    const { token } = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const values: ProductFormValues = {
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        categoryId: String(formData.get("categoryId") ?? ""),
        vatRate: String(formData.get("vatRate") ?? "").trim().replace(",", "."),
        // O bifă trimite "on" doar când e bifată; nebifată nu trimite nimic
        isOrganic: formData.get("isOrganic") === "on",
        isActive: formData.get("isActive") === "on",
    };

    if (values.name.length < 2) {
        return { status: "error", message: "Numele trebuie să aibă cel puțin 2 caractere.", values };
    }
    if (!values.categoryId) {
        return { status: "error", message: "Alege o categorie.", values };
    }
    if (!VAT.test(values.vatRate)) {
        return { status: "error", message: "TVA invalid. Exemplu: 11 sau 21", values };
    }

    try {
        await gql(
            updateProductMutation,
            {
                id,
                patch: {
                    name: values.name,
                    description: values.description || null,
                    categoryId: values.categoryId,
                    vatRate: values.vatRate,
                    isOrganic: values.isOrganic,
                    isActive: values.isActive,
                },
            },
            token,
        );
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message), values };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Detaliile au fost salvate." };
}

// ---------- Produs nou (cu prima mărime) ----------

export type NewProductValues = {
    name: string;
    categoryId: string;
    vatRate: string;
    isOrganic: boolean;
} & VariantValues;

export type NewProductState = { error: string | null; values?: NewProductValues };

const addProductMutation = `
  mutation AddProduct($input: AddProductInput!) {
    addProduct(input: $input) {
      product { slug }
    }
  }
`;

export async function createProduct(
    _previous: NewProductState,
    formData: FormData,
): Promise<NewProductState> {
    const { token } = await requireAdmin();

    const values: NewProductValues = {
        name: String(formData.get("name") ?? "").trim(),
        categoryId: String(formData.get("categoryId") ?? ""),
        vatRate: String(formData.get("vatRate") ?? "").trim().replace(",", "."),
        isOrganic: formData.get("isOrganic") === "on",
        ...readVariant(formData),
    };

    const slug = slugify(values.name);
    if (values.name.length < 2 || !slug) {
        return { error: "Numele trebuie să aibă cel puțin 2 caractere.", values };
    }
    if (!values.categoryId) return { error: "Alege o categorie.", values };
    if (!VAT.test(values.vatRate)) return { error: "TVA invalid. Exemplu: 11 sau 21", values };

    const variantProblem = validateVariant(values);
    if (variantProblem) return { error: variantProblem, values };

    try {
        await gql(
            addProductMutation,
            {
                input: {
                    name: values.name,
                    slug,
                    categoryId: values.categoryId,
                    vatRate: values.vatRate,
                    isOrganic: values.isOrganic,
                    ...variantForApi(values),
                },
            },
            token,
        );
    } catch (error) {
        return { error: friendlyError((error as Error).message), values };
    }

    revalidatePath("/", "layout");
    // redirect "aruncă" o excepție specială, de aceea stă în afara lui try/catch
    redirect(`/admin/produse/${slug}`);
}

// ---------- Mărime nouă ----------

export type NewVariantState = {
    status: "idle" | "saved" | "error";
    message: string;
    values?: VariantValues;
};

const createVariantMutation = `
  mutation CreateVariant($variant: ProductVariantInput!) {
    createProductVariant(input: { productVariant: $variant }) {
      productVariant { id }
    }
  }
`;

export async function addVariant(
    _previous: NewVariantState,
    formData: FormData,
): Promise<NewVariantState> {
    const { token } = await requireAdmin();
    const productId = String(formData.get("productId") ?? "");
    const values = readVariant(formData);

    const problem = validateVariant(values);
    if (problem) return { status: "error", message: problem, values };

    try {
        await gql(createVariantMutation, { variant: { productId, ...variantForApi(values) } }, token);
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message), values };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Mărimea a fost adăugată." };
}

// ---------- Ștergere mărime ----------

const variantCountQuery = `
  query VariantCount($id: UUID!) {
    productById(id: $id) {
      productVariantsByProductId { totalCount }
    }
  }
`;

const deleteVariantMutation = `
  mutation DeleteVariant($id: UUID!) {
    deleteProductVariantById(input: { id: $id }) {
      productVariant { id }
    }
  }
`;

export async function deleteVariant(
    _previous: VariantFormState,
    formData: FormData,
): Promise<VariantFormState> {
    const { token } = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const productId = String(formData.get("productId") ?? "");

    try {
        // Un produs fără nicio mărime n-ar avea preț, deci păstrăm mereu cel puțin una
        const data = await gql<{
            productById: { productVariantsByProductId: { totalCount: number } } | null;
        }>(variantCountQuery, { id: productId }, token);

        if ((data.productById?.productVariantsByProductId.totalCount ?? 0) <= 1) {
            return { status: "error", message: "Produsul trebuie să aibă cel puțin o mărime." };
        }

        await gql(deleteVariantMutation, { id }, token);
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message) };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Mărimea a fost ștearsă." };
}

// ---------- Ștergere produs ----------

export type DeleteProductState = { error: string | null };

const deleteProductMutation = `
  mutation DeleteProduct($id: UUID!) {
    deleteProductById(input: { id: $id }) {
      product { id }
    }
  }
`;

export async function deleteProduct(
    _previous: DeleteProductState,
    formData: FormData,
): Promise<DeleteProductState> {
    const { token } = await requireAdmin();
    const id = String(formData.get("id") ?? "");

    try {
        // Mărimile se șterg automat, datorită lui "on delete cascade" din migrarea 003
        await gql(deleteProductMutation, { id }, token);
    } catch (error) {
        const message = (error as Error).message;
        if (message.includes("foreign key")) {
            return {
                error: "Produsul apare în comenzi și nu poate fi șters. Debifează „Vizibil pe site” ca să-l ascunzi.",
            };
        }
        return { error: `Nu am putut șterge: ${message}` };
    }

    revalidatePath("/", "layout");
    redirect("/admin/produse");
}