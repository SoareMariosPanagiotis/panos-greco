"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gql } from "@/lib/catalog";
import { RETURN_FORM_PATH, isValidIban, normalizeIban, parseJson } from "@/lib/withdrawals";

// Formularul de retur = retragerea din contract (migrația 024): găsirea comenzii fără cont și butonul de confirmare

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// ---------- Găsește comanda (pentru comenzile fără cont) ----------

export type FindOrderState = { orderNumber: string; email: string; error: string | null };

const findQuery = `
  query FindOrderForWithdrawal($number: Int!, $email: String!) {
    findOrderForWithdrawal(orderNumber: $number, email: $email)
  }
`;

export async function findOrderForWithdrawal(_previous: FindOrderState, formData: FormData): Promise<FindOrderState> {
    // „#1004” sau „1004”: amândouă sunt bune
    const orderNumber = text(formData, "orderNumber").replace(/^#/, "");
    const email = text(formData, "email").toLowerCase();

    if (!/^\d{1,9}$/.test(orderNumber)) {
        return { orderNumber, email, error: "Scrie numărul comenzii, de exemplu 1004. Îl găsești în mailul de confirmare." };
    }
    if (!EMAIL.test(email)) {
        return { orderNumber, email, error: "Scrie adresa de email folosită la comandă." };
    }

    let orderId: string | null;
    try {
        const data = await gql<{ findOrderForWithdrawal: string | null }>(findQuery, {
            number: Number(orderNumber),
            email,
        });
        orderId = data.findOrderForWithdrawal;
    } catch {
        return { orderNumber, email, error: "Serverul nu răspunde. Încearcă din nou." };
    }

    if (!orderId) {
        return {
            orderNumber,
            email,
            error: "Nu am găsit o comandă cu acest număr și acest email. Verifică mailul primit la plasarea comenzii.",
        };
    }
    // În afara lui try: redirect() funcționează aruncând o „eroare” specială, pe care n-o prindem
    redirect(`${RETURN_FORM_PATH}/${orderId}`);
}

// ---------- „Confirmă returul” ----------

export type WithdrawalValues = {
    customerName: string;
    email: string;
    reason: string;
    iban: string;
    items: Record<string, number>; // id-ul produsului din comandă → câte bucăți
};

export type WithdrawalState = {
    done: boolean;
    error: string | null;
    // După trimitere: ce afișăm în confirmarea de pe ecran
    createdAt?: string;
    email?: string;
    statement?: string;
    // La eroare: ce a scris clientul, ca să nu scrie din nou
    values?: WithdrawalValues;
};

const requestMutation = `
  mutation RequestWithdrawal($input: RequestWithdrawalInput!) {
    requestWithdrawal(input: $input) { withdrawal }
  }
`;

export async function requestWithdrawal(_previous: WithdrawalState, formData: FormData): Promise<WithdrawalState> {
    const orderId = text(formData, "orderId");
    const customerName = text(formData, "customerName");
    const email = text(formData, "email").toLowerCase();
    const reason = text(formData, "reason");
    const ibanTyped = text(formData, "iban");
    const iban = normalizeIban(ibanTyped);

    // Produsele bifate: fiecare bifă trimite „item” = id-ul produsului din comandă,
    // iar câmpul „qty-<id>” spune câte bucăți (lipsește când e o singură bucată)
    const items: Record<string, number> = {};
    for (const id of formData.getAll("item").map(String)) {
        if (!UUID.test(id)) continue;
        const quantity = Number(formData.get(`qty-${id}`) ?? 1);
        items[id] = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    }

    const values: WithdrawalValues = { customerName, email, reason, iban: ibanTyped, items };
    const fail = (error: string): WithdrawalState => ({ done: false, error, values });

    if (!UUID.test(orderId)) return fail("Nu știm despre ce comandă e vorba. Deschide din nou linkul.");
    if (customerName.length < 2 || customerName.length > 100) return fail("Scrie numele și prenumele.");
    if (!EMAIL.test(email)) return fail("Scrie o adresă de email validă, ca să îți trimitem confirmarea.");
    if (Object.keys(items).length === 0) return fail("Bifează cel puțin un produs.");
    if (reason.length > 1000) return fail("Motivul e prea lung (cel mult 1000 de caractere).");
    if (iban && !isValidIban(iban)) {
        return fail("IBAN-ul nu pare corect. Verifică-l (un IBAN românesc are 24 de caractere) sau lasă câmpul gol.");
    }

    let result: { createdAt: string; email: string; statement: string } | null;
    try {
        const data = await gql<{ requestWithdrawal: { withdrawal: unknown } }>(requestMutation, {
            input: {
                orderId,
                customerName,
                email,
                // PostGraphile primește câmpurile JSON ca text
                items: JSON.stringify(
                    Object.entries(items).map(([orderItemId, quantity]) => ({ order_item_id: orderItemId, quantity })),
                ),
                reason: reason || null,
                iban: iban || null,
            },
        });
        result = parseJson(data.requestWithdrawal.withdrawal);
    } catch (error) {
        return fail(friendlyError(error));
    }
    if (!result) return fail("A apărut o problemă. Încearcă din nou peste câteva momente.");

    // Contul și pagina comenzii arată de acum cererea trimisă
    revalidatePath("/", "layout");
    return { done: true, error: null, createdAt: result.createdAt, email: result.email, statement: result.statement };
}
