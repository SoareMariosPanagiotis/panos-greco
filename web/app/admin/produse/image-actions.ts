"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { UUID } from "@/lib/product-images";

// Acțiunile mici pe pozele unui produs (migrația 032): ștergere, „fă-o principală”, textul alternativ.
// Încărcarea e separat, în ./imagini/route.ts, pentru că fișierul e mare.

export type ImageActionState = { status: "idle" | "saved" | "error"; message: string };

async function run(query: string, variables: Record<string, unknown>): Promise<ImageActionState> {
    const { token } = await requireAdmin();
    try {
        await gql(query, variables, token);
    } catch (error) {
        return { status: "error", message: `Nu am putut salva: ${(error as Error).message}` };
    }
    revalidatePath("/", "layout");
    return { status: "saved", message: "Salvat." };
}

function readId(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    return UUID.test(id) ? id : null;
}

export async function deleteProductImage(_prev: ImageActionState, formData: FormData) {
    const id = readId(formData);
    if (!id) return { status: "error", message: "Poză necunoscută." } as ImageActionState;
    return run(
        `mutation DeleteProductImage($id: UUID!) {
           deleteProductImageById(input: { id: $id }) { deletedProductImageId }
         }`,
        { id },
    );
}

export async function makeProductImageMain(_prev: ImageActionState, formData: FormData) {
    const id = readId(formData);
    if (!id) return { status: "error", message: "Poză necunoscută." } as ImageActionState;
    return run(
        `mutation MakeProductImageMain($id: UUID!) {
           makeProductImageMain(input: { imageId: $id }) { productImage { id } }
         }`,
        { id },
    );
}

export async function updateProductImageAlt(_prev: ImageActionState, formData: FormData) {
    const id = readId(formData);
    if (!id) return { status: "error", message: "Poză necunoscută." } as ImageActionState;
    const alt = String(formData.get("alt") ?? "").trim().slice(0, 200);
    return run(
        `mutation UpdateProductImageAlt($id: UUID!, $alt: String) {
           updateProductImageById(input: { id: $id, productImagePatch: { alt: $alt } }) { productImage { id } }
         }`,
        { id, alt: alt || null },
    );
}

// Mărimea căreia îi aparține poza (migrația 033); gol = poză generală a produsului
export async function updateProductImageVariant(_prev: ImageActionState, formData: FormData) {
    const id = readId(formData);
    if (!id) return { status: "error", message: "Poză necunoscută." } as ImageActionState;
    const variantId = String(formData.get("variantId") ?? "");
    if (variantId && !UUID.test(variantId)) {
        return { status: "error", message: "Mărime necunoscută." } as ImageActionState;
    }
    return run(
        `mutation UpdateProductImageVariant($id: UUID!, $variantId: UUID) {
           updateProductImageById(input: { id: $id, productImagePatch: { variantId: $variantId } }) { productImage { id } }
         }`,
        { id, variantId: variantId || null },
    );
}
