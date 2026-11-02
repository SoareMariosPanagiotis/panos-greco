"use server";

import { revalidatePath } from "next/cache";
import { getToken } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { CUSTOMER_CANCEL_REASONS, isCustomerCancelReason } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";

// Butonul „Anulează comanda” al clientului (migrația 031).
// Regulile le ține baza de date (funcția sales.customer_cancel_order): cine are voie și până când.
// Aici doar verificăm ce vine din formular și traducem răspunsul pentru client.

export type CancelOrderState = { status: "idle" | "done" | "error"; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mutation = `
  mutation CustomerCancelOrder($orderId: UUID!, $reason: String) {
    customerCancelOrder(input: { orderId: $orderId, reason: $reason }) {
      order { id status }
    }
  }
`;

// Mesajele scrise de noi în baza de date sunt deja pentru client; restul primesc o explicație
function friendlyError(message: string) {
    if (/anulat|livrat|plecat|găsit/.test(message)) return message;
    return "Nu am putut anula comanda acum. Încearcă din nou peste un minut sau scrie-ne.";
}

export async function cancelOrder(_previous: CancelOrderState, formData: FormData): Promise<CancelOrderState> {
    const limited = await rateLimit("cancelOrder");
    if (limited) return { status: "error", message: limited };

    const orderId = String(formData.get("orderId") ?? "");
    const reasonKey = String(formData.get("reason") ?? "");
    if (!UUID.test(orderId)) return { status: "error", message: "Nu am găsit comanda." };
    const reason = isCustomerCancelReason(reasonKey) ? CUSTOMER_CANCEL_REASONS[reasonKey] : null;

    // Clientul conectat își anulează comenzile oricând; fără cont, linkul din mail merge 30 de zile.
    // Dacă biletul din cookie a expirat, mai încercăm o dată ca vizitator, cu linkul comenzii.
    const token = await getToken();
    try {
        try {
            await gql(mutation, { orderId, reason }, token ?? undefined);
        } catch (error) {
            if (!token || !/jwt/i.test((error as Error).message)) throw error;
            await gql(mutation, { orderId, reason });
        }
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message) };
    }

    // Pagina comenzii (din mail și din cont) și formularul de retur se reîncarcă cu starea nouă
    revalidatePath("/comanda/confirmare/[id]", "page");
    revalidatePath("/cont", "layout");
    revalidatePath("/retur/formular/[id]", "page");
    return { status: "done", message: "Comanda a fost anulată. Ți-am trimis confirmarea pe email." };
}
