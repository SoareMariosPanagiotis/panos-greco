"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";

// Pașii unei cereri de retur, din admin. Regulile (ce pas urmează după care)
// le verifică trigger-ul din baza de date (migrația 024).

export type ReturnActionState = { status: "idle" | "saved" | "error"; message: string };

const UUID = /^[0-9a-f-]{36}$/i;

// Butonul apăsat trimite „intent”: unul dintre pașii de mai jos sau „note” (doar nota)
const SUCCESS: Record<string, string> = {
    goods_received: "Am notat că produsele au ajuns înapoi.",
    refunded: "Am notat că banii au fost returnați. IBAN-ul a fost șters.",
    closed: "Cererea a fost închisă.",
    note: "Nota a fost salvată.",
};

const updateMutation = `
  mutation UpdateWithdrawal($id: UUID!, $patch: WithdrawalPatch!) {
    updateWithdrawalById(input: { id: $id, withdrawalPatch: $patch }) {
      withdrawal { id status }
    }
  }
`;

export async function updateReturn(
    _previous: ReturnActionState,
    formData: FormData,
): Promise<ReturnActionState> {
    const { token } = await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const intent = String(formData.get("intent") ?? "");
    const note = String(formData.get("adminNote") ?? "").trim();

    if (!UUID.test(id)) return { status: "error", message: "Cerere necunoscută." };
    if (!(intent in SUCCESS)) return { status: "error", message: "Pas necunoscut." };
    if (note.length > 1000) return { status: "error", message: "Nota e prea lungă (cel mult 1000 de caractere)." };

    // Nota se salvează la fiecare buton, ca să nu se piardă ce ai scris
    const patch: Record<string, string | null> = { adminNote: note || null };
    if (intent !== "note") patch.status = intent;

    try {
        await gql(updateMutation, { id, patch }, token);
    } catch (error) {
        const message = (error as Error).message;
        return {
            status: "error",
            message: message.includes("permission denied") ? "Contul tău nu are voie să modifice cererile." : message,
        };
    }

    revalidatePath("/admin", "layout");
    return { status: "saved", message: SUCCESS[intent] };
}
