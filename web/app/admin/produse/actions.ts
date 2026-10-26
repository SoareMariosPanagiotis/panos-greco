"use server";

import { revalidatePath } from "next/cache";
import { gql } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";

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

    if (!/^\d+(\.\d{1,2})?$/.test(price)) {
        return { status: "error", message: "Preț invalid. Exemplu: 25 sau 25.50", price, stock };
    }
    if (!/^\d+$/.test(stock)) {
        return { status: "error", message: "Stocul trebuie să fie un număr întreg, de la 0 în sus.", price, stock };
    }

    try {
        // A doua încuietoare: Postgres acceptă modificarea doar cu biletul de admin
        await gql(updateVariantMutation, { id, price, stock: Number(stock) }, token);
    } catch (error) {
        return { status: "error", message: `Nu am putut salva: ${(error as Error).message}`, price, stock };
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
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(values.vatRate)) {
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
        return { status: "error", message: `Nu am putut salva: ${(error as Error).message}`, values };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Detaliile au fost salvate." };
}