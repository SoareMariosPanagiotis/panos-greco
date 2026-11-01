"use server";

import { cuiDigits, findCompany, isValidCui, type Company } from "@/lib/anaf";
import { getSession } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { saveMyAddress } from "@/lib/customer";

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
    companyAddress: string;
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

const rememberPhoneMutation = `
  mutation RememberPhone($phone: String!) {
    rememberPhone(input: { phone: $phone }) { clientMutationId }
  }
`;

// După comandă, pentru data viitoare: telefonul (doar dacă nu avea deja unul în cont)
// și, dacă a bifat, adresa nouă. Sunt „bonusuri”: dacă nu reușesc, comanda rămâne plasată.
async function rememberForNextTime(token: string, formData: FormData, values: CheckoutValues) {
    const jobs: Promise<unknown>[] = [gql(rememberPhoneMutation, { phone: values.phone }, token)];
    if (formData.get("saveAddress") === "on" && values.address) {
        jobs.push(saveMyAddress(token, values));
    }
    await Promise.allSettled(jobs); // allSettled: așteaptă tot și nu aruncă niciodată eroare
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
        companyAddress: text(formData, "companyAddress"),
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
    // Un CUI greșit ar ajunge pe factură: verificăm cifra de control, chiar dacă n-a apăsat „Caută”
    if (values.wantsInvoice && !isValidCui(cuiDigits(values.companyCui))) {
        return { error: "CUI-ul firmei nu este valid. Verifică cifrele.", values };
    }

    // Clientul conectat trimite și biletul lui: place_order ia user_id din bilet și pune
    // comanda în contul lui. Adminul care testează magazinul comandă ca un vizitator.
    const session = await getSession();
    const client = session?.user.role === "client" ? session : null;
    // Clientul comandă cu emailul contului. Câmpul e blocat în pagină, dar nu ne bazăm pe asta:
    // orice câmp dintr-un formular se poate schimba din browser.
    const email = client ? client.user.email : values.email;

    let orderId: string;
    try {
        const data = await gql<{ placeOrder: { order: { id: string } } }>(placeOrderMutation, {
            input: {
                variantIds,
                quantities,
                deliveryCode: text(formData, "deliveryCode"),
                paymentCode: text(formData, "paymentCode"),
                firstName: values.firstName,
                lastName: values.lastName,
                email,
                phone: values.phone,
                county: values.county || null,
                city: values.city || null,
                address: values.address || null,
                postalCode: values.postalCode || null,
                companyName: values.wantsInvoice ? values.companyName || null : null,
                companyCui: values.wantsInvoice ? values.companyCui || null : null,
                companyRegNo: values.wantsInvoice ? values.companyRegNo || null : null,
                companyAddress: values.wantsInvoice ? values.companyAddress || null : null,
                customerNote: values.customerNote || null,
            },
        }, client?.token);
        orderId = data.placeOrder.order.id;
    } catch (error) {
        return { error: friendlyError((error as Error).message), values };
    }

    // Comanda e plasată. Ce urmează e doar pentru data viitoare
    if (client) await rememberForNextTime(client.token, formData, values);
    return { error: null, orderId };
}

// ---------- Datele firmei, după CUI (ANAF) ----------

export type CompanyLookup =
    | { status: "found"; company: Company }
    | { status: "invalid" | "not-found" | "error"; message: string };

// Butonul „Caută la ANAF” de la Facturare
export async function lookupCompany(cui: string): Promise<CompanyLookup> {
    const digits = cuiDigits(String(cui));
    if (!isValidCui(digits)) {
        return { status: "invalid", message: "CUI-ul nu este valid. Verifică cifrele." };
    }

    try {
        const company = await findCompany(digits);
        return company
            ? { status: "found", company }
            : { status: "not-found", message: "ANAF nu are o firmă cu acest CUI. Verifică cifrele." };
    } catch (error) {
        // Clientul vede un mesaj simplu; motivul tehnic rămâne în jurnalul serverului
        console.error("Căutarea la ANAF a eșuat:", error);
        return {
            status: "error",
            message: "ANAF nu răspunde acum. Completează datele firmei de mână.",
        };
    }
}