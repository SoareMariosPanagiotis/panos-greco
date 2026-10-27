"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";

const UUID = /^[0-9a-f-]{36}$/i;
const AMOUNT = /^\d{1,6}(\.\d{1,2})?$/; // 20 sau 19.99
const WHOLE = /^\d{1,4}$/; // număr întreg

// Aceleași câmpuri pentru livrare și pentru plată.
// „amount” înseamnă prețul livrării, respectiv taxa metodei de plată.
export type MethodFormValues = {
    name: string;
    description: string;
    amount: string;
    freeOver: string; // doar la livrare
    sortOrder: string;
    isActive: boolean;
    needsAwb: boolean; // doar la livrare
};

export type MethodFormState = {
    status: "idle" | "saved" | "error";
    message: string;
    values?: MethodFormValues;
};

type MethodSummary = { id: string; code: string; isActive: boolean };

function readValues(formData: FormData): MethodFormValues {
    return {
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        amount: String(formData.get("amount") ?? "").trim().replace(",", "."),
        freeOver: String(formData.get("freeOver") ?? "").trim().replace(",", "."),
        sortOrder: String(formData.get("sortOrder") ?? "").trim(),
        // O bifă trimite "on" doar când e bifată; nebifată nu trimite nimic
        isActive: formData.get("isActive") === "on",
        needsAwb: formData.get("needsAwb") === "on",
    };
}

function validate(values: MethodFormValues) {
    if (values.name.length < 2) return "Numele trebuie să aibă cel puțin 2 caractere.";
    if (values.name.length > 80) return "Numele e prea lung (maxim 80 de caractere).";
    if (values.description.length > 300) return "Descrierea e prea lungă (maxim 300 de caractere).";
    if (!AMOUNT.test(values.amount)) return "Sumă invalidă. Exemplu: 20 sau 19.99";
    if (values.freeOver && !AMOUNT.test(values.freeOver)) {
        return "Pragul de livrare gratuită e invalid. Exemplu: 200";
    }
    if (!WHOLE.test(values.sortOrder)) return "Ordinea trebuie să fie un număr întreg.";
    return null;
}

// ---------- Livrare ----------

const deliveryMethodsQuery = `
  query DeliveryMethodsCheck {
    allDeliveryMethods { nodes { id code isActive } }
  }
`;

const updateDeliveryMutation = `
  mutation UpdateDeliveryMethod($id: UUID!, $patch: DeliveryMethodPatch!) {
    updateDeliveryMethodById(input: { id: $id, deliveryMethodPatch: $patch }) {
      deliveryMethod { id }
    }
  }
`;

export async function updateDeliveryMethod(
    _previous: MethodFormState,
    formData: FormData,
): Promise<MethodFormState> {
    const { token } = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const values = readValues(formData);

    if (!UUID.test(id)) return { status: "error", message: "Metodă necunoscută.", values };
    const invalid = validate(values);
    if (invalid) return { status: "error", message: invalid, values };

    try {
        // Fără nicio livrare activă, nimeni n-ar mai putea comanda
        if (!values.isActive) {
            const data = await gql<{ allDeliveryMethods: { nodes: MethodSummary[] } }>(
                deliveryMethodsQuery,
                {},
                token,
            );
            const othersActive = data.allDeliveryMethods.nodes.some((m) => m.id !== id && m.isActive);
            if (!othersActive) {
                return {
                    status: "error",
                    message: "Trebuie să rămână cel puțin o metodă de livrare activă.",
                    values,
                };
            }
        }

        await gql(
            updateDeliveryMutation,
            {
                id,
                patch: {
                    name: values.name,
                    description: values.description || null,
                    price: values.amount,
                    freeOver: values.freeOver || null,
                    sortOrder: Number(values.sortOrder),
                    isActive: values.isActive,
                    needsAwb: values.needsAwb,
                },
            },
            token,
        );
    } catch (error) {
        return { status: "error", message: `Nu am putut salva: ${(error as Error).message}`, values };
    }

    // Coșul, checkout-ul și bara de livrare gratuită citesc de acum noile valori
    revalidatePath("/", "layout");
    return { status: "saved", message: "Salvat." };
}

// ---------- Plată ----------

const paymentMethodsQuery = `
  query PaymentMethodsCheck {
    allPaymentMethods { nodes { id code isActive } }
  }
`;

const updatePaymentMutation = `
  mutation UpdatePaymentMethod($id: UUID!, $patch: PaymentMethodPatch!) {
    updatePaymentMethodById(input: { id: $id, paymentMethodPatch: $patch }) {
      paymentMethod { id }
    }
  }
`;

export async function updatePaymentMethod(
    _previous: MethodFormState,
    formData: FormData,
): Promise<MethodFormState> {
    const { token } = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const values = readValues(formData);

    if (!UUID.test(id)) return { status: "error", message: "Metodă necunoscută.", values };
    const invalid = validate(values);
    if (invalid) return { status: "error", message: invalid, values };

    try {
        const data = await gql<{ allPaymentMethods: { nodes: MethodSummary[] } }>(
            paymentMethodsQuery,
            {},
            token,
        );
        const methods = data.allPaymentMethods.nodes;
        const current = methods.find((m) => m.id === id);
        if (!current) return { status: "error", message: "Metodă necunoscută.", values };

        // Cardul are nevoie întâi de un procesator de plăți (Netopia, Stripe etc.)
        if (current.code === "card" && values.isActive) {
            return {
                status: "error",
                message: "Plata cu cardul se poate activa abia după ce integrăm un procesator de plăți.",
                values: { ...values, isActive: false },
            };
        }
        if (!values.isActive && !methods.some((m) => m.id !== id && m.isActive)) {
            return { status: "error", message: "Trebuie să rămână cel puțin o metodă de plată activă.", values };
        }

        await gql(
            updatePaymentMutation,
            {
                id,
                patch: {
                    name: values.name,
                    description: values.description || null,
                    fee: values.amount,
                    sortOrder: Number(values.sortOrder),
                    isActive: values.isActive,
                },
            },
            token,
        );
    } catch (error) {
        return { status: "error", message: `Nu am putut salva: ${(error as Error).message}`, values };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Salvat." };
}