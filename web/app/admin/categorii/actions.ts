"use server";

import { revalidatePath } from "next/cache";
import { gql } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export type CategoryFormState = {
    status: "idle" | "saved" | "error";
    message: string;
    name?: string;
    sortOrder?: string;
};

// Traduce erorile din Postgres în mesaje pe înțelesul omului
function friendlyError(message: string) {
    if (message.includes("duplicate key")) {
        return "Există deja o categorie cu acest nume.";
    }
    if (message.includes("foreign key")) {
        return "Categoria are produse. Mută-le întâi în altă categorie.";
    }
    return `Nu am putut salva: ${message}`;
}

function readForm(formData: FormData) {
    return {
        name: String(formData.get("name") ?? "").trim(),
        sortOrder: String(formData.get("sortOrder") ?? "").trim(),
    };
}

function validate(name: string, sortOrder: string) {
    if (name.length < 2) return "Numele trebuie să aibă cel puțin 2 caractere.";
    if (!slugify(name)) return "Numele trebuie să conțină litere sau cifre.";
    if (!/^\d+$/.test(sortOrder)) return "Ordinea trebuie să fie un număr întreg.";
    return null;
}

// ---------- Categorie nouă ----------

const createMutation = `
  mutation CreateCategory($name: String!, $slug: String!, $sortOrder: Int!) {
    createCategory(input: { category: { name: $name, slug: $slug, sortOrder: $sortOrder } }) {
      category { id }
    }
  }
`;

export async function createCategory(
    _previous: CategoryFormState,
    formData: FormData,
): Promise<CategoryFormState> {
    const { token } = await requireAdmin();
    const { name, sortOrder } = readForm(formData);

    const problem = validate(name, sortOrder);
    if (problem) return { status: "error", message: problem, name, sortOrder };

    try {
        await gql(createMutation, { name, slug: slugify(name), sortOrder: Number(sortOrder) }, token);
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message), name, sortOrder };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: `Categoria „${name}" a fost adăugată.` };
}

// ---------- Redenumire și ordine ----------

const updateMutation = `
  mutation UpdateCategory($id: UUID!, $name: String!, $sortOrder: Int!) {
    updateCategoryById(input: { id: $id, categoryPatch: { name: $name, sortOrder: $sortOrder } }) {
      category { id }
    }
  }
`;

export async function updateCategory(
    _previous: CategoryFormState,
    formData: FormData,
): Promise<CategoryFormState> {
    const { token } = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const { name, sortOrder } = readForm(formData);

    const problem = validate(name, sortOrder);
    if (problem) return { status: "error", message: problem, name, sortOrder };

    try {
        // Slug-ul NU se schimbă la redenumire: linkurile vechi trebuie să meargă în continuare
        await gql(updateMutation, { id, name, sortOrder: Number(sortOrder) }, token);
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message), name, sortOrder };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Salvat" };
}

// ---------- Ștergere (doar categorii goale) ----------

const deleteMutation = `
  mutation DeleteCategory($id: UUID!) {
    deleteCategoryById(input: { id: $id }) {
      category { id }
    }
  }
`;

export async function deleteCategory(
    _previous: CategoryFormState,
    formData: FormData,
): Promise<CategoryFormState> {
    const { token } = await requireAdmin();
    const id = String(formData.get("id") ?? "");

    try {
        await gql(deleteMutation, { id }, token);
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message) };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Categoria a fost ștearsă." };
}