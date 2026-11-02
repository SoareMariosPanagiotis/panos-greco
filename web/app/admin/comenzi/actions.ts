"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { ORDER_STATUSES, isCancelReason } from "@/lib/orders";

export type OrderActionState = {
    status: "idle" | "saved" | "error";
    message: string;
    // La eroare trimitem înapoi ce ai scris, ca să nu tastezi din nou
    courier?: string;
    awb?: string;
};

const UUID = /^[0-9a-f-]{36}$/i;
const AWB = /^[A-Za-z0-9]{4,30}$/; // doar litere și cifre, fără spații

// Mesajele din trigger sunt deja în română; erorile tehnice primesc o explicație
function friendlyError(message: string) {
    if (message.includes("permission denied")) {
        return "Contul tău nu are voie să modifice comenzi.";
    }
    return `Nu am putut salva: ${message}`;
}

// Ce afișăm după fiecare buton apăsat cu succes
const SUCCESS: Record<string, string> = {
    confirmed: "Comanda a fost confirmată.",
    ready_for_pickup: "Comanda e gata de ridicare.",
    shipped: "Comanda a fost marcată ca expediată.",
    delivered: "Comanda a fost marcată ca livrată.",
    cancelled: "Comanda a fost anulată, iar stocul a revenit. Dacă avea factură, s-a stornat automat.",
};

// ---------- Schimbarea stării ----------

const changeStatusMutation = `
  mutation ChangeOrderStatus($id: UUID!, $patch: OrderPatch!) {
    updateOrderById(input: { id: $id, orderPatch: $patch }) {
      order { id status }
    }
  }
`;

export async function changeOrderStatus(
    _previous: OrderActionState,
    formData: FormData,
): Promise<OrderActionState> {
    // Prima încuietoare: oricine poate apela funcția, deci verificăm cine apasă butonul
    const { token } = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");
    const courier = String(formData.get("courier") ?? "").trim();
    const awb = String(formData.get("awb") ?? "").trim();
    const cancelReason = String(formData.get("cancelReason") ?? "");

    if (!UUID.test(id)) return { status: "error", message: "Comandă necunoscută." };
    if (!ORDER_STATUSES.some((known) => known === status)) {
        return { status: "error", message: "Stare necunoscută." };
    }
    if (awb && !AWB.test(awb)) {
        return { status: "error", message: "AWB-ul are doar litere și cifre, fără spații (4–30).", courier, awb };
    }
    if (courier.length > 40) {
        return { status: "error", message: "Numele firmei de curierat e prea lung.", courier, awb };
    }

    // Curierul și AWB-ul se trimit doar la expediere.
    // Dacă lipsesc la o livrare prin curier, trigger-ul din baza de date refuză.
    const patch: Record<string, string | null> = { status };
    if (status === "shipped") {
        patch.courier = courier || null;
        patch.awb = awb || null;
    }
    // La anulare, motivul: apare pe stornare și în mailul clientului (migrația 029)
    if (status === "cancelled") {
        if (!isCancelReason(cancelReason)) return { status: "error", message: "Alege motivul anulării." };
        patch.cancelReason = cancelReason;
    }

    try {
        // A doua încuietoare: Postgres (drepturile adminului + trigger-ul paznic)
        await gql(changeStatusMutation, { id, patch }, token);
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message), courier, awb };
    }

    // Lista, cardul din admin și stocurile de pe site se reîncarcă
    revalidatePath("/", "layout");
    return { status: "saved", message: SUCCESS[status] ?? "Salvat." };
}

// ---------- Plata ----------

const markPaidMutation = `
  mutation MarkOrderPaid($id: UUID!) {
    updateOrderById(input: { id: $id, orderPatch: { paymentStatus: "paid" } }) {
      order { id paymentStatus }
    }
  }
`;

export async function markOrderPaid(
    _previous: OrderActionState,
    formData: FormData,
): Promise<OrderActionState> {
    const { token } = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    if (!UUID.test(id)) return { status: "error", message: "Comandă necunoscută." };

    try {
        await gql(markPaidMutation, { id }, token);
    } catch (error) {
        return { status: "error", message: friendlyError((error as Error).message) };
    }

    revalidatePath("/", "layout");
    return { status: "saved", message: "Plata a fost înregistrată." };
}