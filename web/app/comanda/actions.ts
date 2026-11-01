"use server";

import { gql } from "@/lib/catalog";

// ---------- Prețurile reale pentru produsele din coș ----------

export type LiveVariant = {
    id: string;
    productName: string;
    sizeLabel: string;
    price: string;
    stock: number;
};

const pricesQuery = `
  query CartPrices($ids: [UUID]!) {
    variantsByIds(ids: $ids) {
      nodes {
        id
        sizeLabel
        price
        stock
        productByProductId { name }
      }
    }
  }
`;

type PricesResult = {
    variantsByIds: {
        nodes: {
            id: string;
            sizeLabel: string;
            price: string;
            stock: number;
            productByProductId: { name: string } | null;
        }[];
    };
};

// Întoarce doar mărimile care încă se pot cumpăra.
// La un produs ascuns, RLS-ul face ca productByProductId să fie null, deci îl sărim.
export async function getLiveVariants(ids: string[]): Promise<LiveVariant[]> {
    if (ids.length === 0) return [];
    const data = await gql<PricesResult>(pricesQuery, { ids });

    return data.variantsByIds.nodes.flatMap((node) =>
        node.productByProductId
            ? [
                {
                    id: node.id,
                    productName: node.productByProductId.name,
                    sizeLabel: node.sizeLabel,
                    price: node.price,
                    stock: node.stock,
                },
            ]
            : [],
    );
}

// ---------- Plasarea comenzii ----------

export type CheckoutValues = {
    lastName: string;
    firstName: string;
    email: string;
    phone: string;
    county: string;
    city: string;
    address: string;
    postalCode: string;
    wantsInvoice: boolean;
    companyName: string;
    companyCui: string;
    companyRegNo: string;
    customerNote: string;
};

export type CheckoutState = {
    error: string | null;
    orderId?: string;
    values?: CheckoutValues;
};

const placeOrderMutation = `
  mutation PlaceOrder($input: PlaceOrderInput!) {
    placeOrder(input: $input) {
      order { id }
    }
  }
`;

function text(formData: FormData, name: string) {
    return String(formData.get(name) ?? "").trim();
}

// Mesajele scrise de noi în place_order sunt deja pe înțelesul clientului.
// Erorile tehnice, neprevăzute, le înlocuim cu un mesaj general.
function friendlyError(message: string) {
    const technical = ["syntax", "violates", "permission", "relation", "fetch failed"];
    if (technical.some((word) => message.toLowerCase().includes(word))) {
        return "A apărut o problemă la plasarea comenzii. Încearcă din nou sau sună-ne.";
    }
    return message;
}

export async function submitOrder(
    _previous: CheckoutState,
    formData: FormData,
): Promise<CheckoutState> {
    const values: CheckoutValues = {
        lastName: text(formData, "lastName"),
        firstName: text(formData, "firstName"),
        email: text(formData, "email"),
        phone: text(formData, "phone"),
        county: text(formData, "county"),
        city: text(formData, "city"),
        address: text(formData, "address"),
        postalCode: text(formData, "postalCode"),
        wantsInvoice: formData.get("wantsInvoice") === "on",
        companyName: text(formData, "companyName"),
        companyCui: text(formData, "companyCui"),
        companyRegNo: text(formData, "companyRegNo"),
        customerNote: text(formData, "customerNote"),
    };

    // Capcană pentru roboți: câmpul "website" e invizibil pentru oameni
    if (text(formData, "website")) {
        return { error: "Comanda nu a putut fi plasată.", values };
    }
    if (formData.get("acceptTerms") !== "on") {
        return { error: "Trebuie să accepți termenii și condițiile.", values };
    }

    // Din coș trimitem DOAR mărimile și cantitățile. Prețul îl calculează baza de date
    const variantIds = formData.getAll("variantId").map(String);
    const quantities = formData.getAll("quantity").map(Number);
    if (variantIds.length === 0) {
        return { error: "Coșul este gol.", values };
    }

    try {
        const data = await gql<{ placeOrder: { order: { id: string } } }>(placeOrderMutation, {
            input: {
                variantIds,
                quantities,
                deliveryCode: text(formData, "deliveryCode"),
                paymentCode: text(formData, "paymentCode"),
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                phone: values.phone,
                county: values.county || null,
                city: values.city || null,
                address: values.address || null,
                postalCode: values.postalCode || null,
                companyName: values.wantsInvoice ? values.companyName || null : null,
                companyCui: values.wantsInvoice ? values.companyCui || null : null,
                companyRegNo: values.wantsInvoice ? values.companyRegNo || null : null,
                customerNote: values.customerNote || null,
            },
        });
        return { error: null, orderId: data.placeOrder.order.id };
    } catch (error) {
        return { error: friendlyError((error as Error).message), values };
    }
}