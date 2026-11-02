"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";

// Facturile din admin (migrația 028). Regulile (ce se poate emite, ce se poate storna,
// numerotarea) le păzește baza de date; aici doar trimitem cererile și arătăm mesajele.

export type InvoiceActionState = { status: "idle" | "saved" | "error"; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string) {
    return String(formData.get(name) ?? "").trim();
}

// Mesajele scrise de noi în baza de date sunt pe înțelesul tău; erorile tehnice, neprevăzute, nu
function failed(error: unknown): InvoiceActionState {
    const message = error instanceof Error ? error.message : "";
    const technical = ["syntax", "violates", "permission", "relation", "function", "invalid input", "fetch failed", "column"];
    if (!message || technical.some((word) => message.toLowerCase().includes(word))) {
        return { status: "error", message: "A apărut o problemă. Încearcă din nou peste câteva momente." };
    }
    return { status: "error", message };
}

// ---------- Ciorna, din pagina comenzii ----------

const createDraftMutation = `
  mutation CreateInvoiceDraft($orderId: UUID!) {
    createInvoiceDraft(input: { orderId: $orderId }) { invoice { id } }
  }
`;

export async function createInvoiceDraft(
    _previous: InvoiceActionState,
    formData: FormData,
): Promise<InvoiceActionState> {
    const { token } = await requireAdmin();
    const orderId = text(formData, "orderId");
    if (!UUID.test(orderId)) return { status: "error", message: "Comandă necunoscută." };

    let invoiceId: string;
    try {
        const data = await gql<{ createInvoiceDraft: { invoice: { id: string } } }>(
            createDraftMutation,
            { orderId },
            token,
        );
        invoiceId = data.createInvoiceDraft.invoice.id;
    } catch (error) {
        return failed(error);
    }
    revalidatePath("/admin", "layout");
    // În afara lui try: redirect() funcționează aruncând o „eroare” specială, pe care n-o prindem
    redirect(`/admin/facturi/${invoiceId}`);
}

// ---------- Corecturi în ciornă ----------

const updateDraftMutation = `
  mutation UpdateInvoiceDraft($input: UpdateInvoiceDraftInput!) {
    updateInvoiceDraft(input: $input) { invoice { id } }
  }
`;

export async function saveInvoiceDraft(
    _previous: InvoiceActionState,
    formData: FormData,
): Promise<InvoiceActionState> {
    const { token } = await requireAdmin();
    const invoiceId = text(formData, "invoiceId");
    if (!UUID.test(invoiceId)) return { status: "error", message: "Factură necunoscută." };

    try {
        await gql(
            updateDraftMutation,
            {
                input: {
                    invoiceId,
                    buyerName: text(formData, "buyerName"),
                    buyerCui: text(formData, "buyerCui") || null,
                    buyerRegCom: text(formData, "buyerRegCom") || null,
                    buyerAddress: text(formData, "buyerAddress") || null,
                    note: text(formData, "note") || null,
                },
            },
            token,
        );
    } catch (error) {
        return failed(error);
    }
    revalidatePath("/admin", "layout");
    return { status: "saved", message: "Ciorna a fost salvată." };
}

// ---------- „Emite factura” ----------

const issueMutation = `
  mutation IssueInvoice($invoiceId: UUID!) {
    issueInvoice(input: { invoiceId: $invoiceId }) { invoice { id series number } }
  }
`;

export async function issueInvoice(_previous: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
    const { token } = await requireAdmin();
    const invoiceId = text(formData, "invoiceId");
    if (!UUID.test(invoiceId)) return { status: "error", message: "Factură necunoscută." };

    let label: string;
    try {
        const data = await gql<{ issueInvoice: { invoice: { series: string; number: number } } }>(
            issueMutation,
            { invoiceId },
            token,
        );
        label = `${data.issueInvoice.invoice.series} ${data.issueInvoice.invoice.number}`;
    } catch (error) {
        return failed(error);
    }
    revalidatePath("/admin", "layout");
    return { status: "saved", message: `Factura ${label} a fost emisă.` };
}

// ---------- Aruncă ciorna ----------

const discardMutation = `
  mutation DiscardInvoiceDraft($invoiceId: UUID!) {
    discardInvoiceDraft(input: { invoiceId: $invoiceId }) { boolean }
  }
`;

export async function discardInvoiceDraft(
    _previous: InvoiceActionState,
    formData: FormData,
): Promise<InvoiceActionState> {
    const { token } = await requireAdmin();
    const invoiceId = text(formData, "invoiceId");
    const back = text(formData, "back");
    if (!UUID.test(invoiceId)) return { status: "error", message: "Factură necunoscută." };

    try {
        await gql(discardMutation, { invoiceId }, token);
    } catch (error) {
        return failed(error);
    }
    revalidatePath("/admin", "layout");
    // Înapoi de unde a venit ciorna: pagina comenzii sau lista facturilor
    redirect(back.startsWith("/admin/") ? back : "/admin/facturi");
}

// ---------- Stornarea ----------

const stornoMutation = `
  mutation CreateStornoDraft($invoiceId: UUID!, $items: JSON) {
    createStornoDraft(input: { invoiceId: $invoiceId, items: $items }) { invoice { id } }
  }
`;

export async function createStornoDraft(
    _previous: InvoiceActionState,
    formData: FormData,
): Promise<InvoiceActionState> {
    const { token } = await requireAdmin();
    const invoiceId = text(formData, "invoiceId");
    if (!UUID.test(invoiceId)) return { status: "error", message: "Factură necunoscută." };

    // „Toată factura” → fără listă: baza de date ia tot ce n-a fost stornat încă.
    // Altfel: fiecare rând are câmpul qty-<id> cu câte bucăți stornăm.
    let items: string | null = null;
    if (text(formData, "intent") !== "all") {
        const chosen: { line_id: string; quantity: number }[] = [];
        for (const [name, value] of formData.entries()) {
            const lineId = name.startsWith("qty-") ? name.slice(4) : "";
            const quantity = Number(value);
            if (UUID.test(lineId) && Number.isInteger(quantity) && quantity > 0) {
                chosen.push({ line_id: lineId, quantity });
            }
        }
        if (chosen.length === 0) return { status: "error", message: "Alege câte bucăți stornezi din cel puțin un rând." };
        items = JSON.stringify(chosen); // PostGraphile primește câmpurile JSON ca text
    }

    let stornoId: string;
    try {
        const data = await gql<{ createStornoDraft: { invoice: { id: string } } }>(
            stornoMutation,
            { invoiceId, items },
            token,
        );
        stornoId = data.createStornoDraft.invoice.id;
    } catch (error) {
        return failed(error);
    }
    revalidatePath("/admin", "layout");
    redirect(`/admin/facturi/${stornoId}`);
}

// ---------- Emailul cu factura ----------

const resendMutation = `
  mutation ResendInvoiceEmail($invoiceId: UUID!) {
    resendInvoiceEmail(input: { invoiceId: $invoiceId }) { boolean }
  }
`;

// Factura intră din nou în coada poștașului (de exemplu, clientul spune că n-a primit-o)
export async function resendInvoiceEmail(
    _previous: InvoiceActionState,
    formData: FormData,
): Promise<InvoiceActionState> {
    const { token } = await requireAdmin();
    const invoiceId = text(formData, "invoiceId");
    if (!UUID.test(invoiceId)) return { status: "error", message: "Factură necunoscută." };

    try {
        await gql(resendMutation, { invoiceId }, token);
    } catch (error) {
        return failed(error);
    }
    revalidatePath("/admin", "layout");
    return { status: "saved", message: "Factura pleacă din nou pe email, în câteva secunde." };
}

// ---------- Seria ----------

const seriesMutation = `
  mutation UpdateInvoiceSeries($code: String!, $nextNumber: Int!) {
    updateInvoiceSeries(input: { code: $code, nextNumber: $nextNumber }) {
      invoiceSeriesCounter { code nextNumber }
    }
  }
`;

export async function updateInvoiceSeries(
    _previous: InvoiceActionState,
    formData: FormData,
): Promise<InvoiceActionState> {
    const { token } = await requireAdmin();
    const code = text(formData, "code").toUpperCase();
    const nextNumber = Number(text(formData, "nextNumber"));

    if (!/^[A-Z][A-Z0-9]{0,9}$/.test(code)) {
        return { status: "error", message: "Codul seriei: litere și cifre, fără spații, începe cu o literă (de exemplu PGW)." };
    }
    if (!Number.isInteger(nextNumber) || nextNumber < 1 || nextNumber > 999_999_999) {
        return { status: "error", message: "Numărul trebuie să fie un număr întreg, de la 1 în sus." };
    }

    let saved: { code: string; nextNumber: number };
    try {
        const data = await gql<{ updateInvoiceSeries: { invoiceSeriesCounter: { code: string; nextNumber: number } } }>(
            seriesMutation,
            { code, nextNumber },
            token,
        );
        saved = data.updateInvoiceSeries.invoiceSeriesCounter;
    } catch (error) {
        return failed(error);
    }
    revalidatePath("/admin", "layout");
    return { status: "saved", message: `Următoarea factură va fi ${saved.code} ${saved.nextNumber}.` };
}
