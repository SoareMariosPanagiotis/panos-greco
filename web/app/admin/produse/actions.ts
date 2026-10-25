"use server";

import { revalidatePath } from "next/cache";
import { gql } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";

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

    // Reconstruiește paginile, ca prețul nou să apară peste tot pe site
    revalidatePath("/", "layout");
    return { status: "saved", message: "Salvat" };
}