"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { saveMyAddress, type AddressInput } from "@/lib/customer";

// Acțiunile din „Contul meu”: datele personale și adresele.
// Fiecare începe cu requireCustomer(): fără bilet de client nu se schimbă nimic.

const UUID = /^[0-9a-f-]{36}$/i;

function text(formData: FormData, name: string) {
    return String(formData.get(name) ?? "").trim();
}

// Mesajele scrise de noi în baza de date sunt deja pe înțelesul clientului.
// Erorile tehnice, neprevăzute, le înlocuim cu un mesaj general.
function friendlyError(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const technical = ["syntax", "violates", "permission", "relation", "function", "invalid input", "fetch failed"];
    if (!message || technical.some((word) => message.toLowerCase().includes(word))) {
        return "A apărut o problemă. Încearcă din nou peste câteva momente.";
    }
    return message;
}

// ---------- Datele mele ----------

export type ProfileValues = { lastName: string; firstName: string; phone: string };
export type ProfileState = { error: string | null; values?: ProfileValues };

const updateProfileMutation = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) { user { email } }
  }
`;

export async function updateProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
    const { token } = await requireCustomer();
    const values: ProfileValues = {
        lastName: text(formData, "lastName"),
        firstName: text(formData, "firstName"),
        phone: text(formData, "phone"),
    };

    try {
        await gql(
            updateProfileMutation,
            { input: { firstName: values.firstName, lastName: values.lastName, phone: values.phone || null } },
            token,
        );
    } catch (error) {
        return { error: friendlyError(error), values };
    }

    // „/” cu „layout”: și salutul din meniu („Salut, …”) se reîncarcă, pe toate paginile
    revalidatePath("/", "layout");
    redirect("/cont");
}

// ---------- Adresele mele ----------

export type AddressState = { error: string | null; values?: AddressInput };

export async function saveAddress(_previous: AddressState, formData: FormData): Promise<AddressState> {
    const { token } = await requireCustomer();
    const id = text(formData, "id"); // gol = adresă nouă
    const values: AddressInput = {
        county: text(formData, "county"),
        city: text(formData, "city"),
        address: text(formData, "address"),
        postalCode: text(formData, "postalCode"),
    };

    if (id && !UUID.test(id)) {
        return { error: "Adresa nu există.", values };
    }

    try {
        await saveMyAddress(token, values, id || null);
    } catch (error) {
        return { error: friendlyError(error), values };
    }

    revalidatePath("/cont", "layout");
    redirect("/cont/adrese");
}

const setDefaultMutation = `
  mutation SetDefaultAddress($id: UUID!) {
    setDefaultAddress(input: { addressId: $id }) { customerAddress { id } }
  }
`;

const deleteMutation = `
  mutation DeleteAddress($id: UUID!) {
    deleteAddress(input: { addressId: $id }) { customerAddress { id } }
  }
`;

// Butoanele din lista de adrese. Nu întorc mesaje: lista se reîncarcă și arată
// situația reală (chiar dacă, de exemplu, adresa fusese ștearsă între timp din alt tab).
export async function setDefaultAddress(formData: FormData) {
    const { token } = await requireCustomer();
    const id = text(formData, "id");
    if (UUID.test(id)) {
        await gql(setDefaultMutation, { id }, token).catch(() => null);
    }
    revalidatePath("/cont", "layout");
}

export async function deleteAddress(formData: FormData) {
    const { token } = await requireCustomer();
    const id = text(formData, "id");
    if (UUID.test(id)) {
        await gql(deleteMutation, { id }, token).catch(() => null);
    }
    revalidatePath("/cont", "layout");
}
