"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchUser, homeFor, requireCustomer, startSession } from "@/lib/auth";
import { gql } from "@/lib/catalog";

// Securitatea contului (migrația 022): parolă uitată, parolă nouă,
// confirmarea emailului și schimbarea parolei din cont.

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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

// ---------- Parolă uitată ----------

export type ForgotState = { sent: boolean; email: string; error: string | null };

const requestResetMutation = `
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(input: { email: $email }) { clientMutationId }
  }
`;

export async function requestPasswordReset(_previous: ForgotState, formData: FormData): Promise<ForgotState> {
    const email = text(formData, "email").toLowerCase();

    // Capcană pentru roboți: le spunem „trimis” și nu trimitem nimic
    if (text(formData, "website")) return { sent: true, email, error: null };
    if (!EMAIL.test(email)) return { sent: false, email, error: "Scrie o adresă de email validă." };

    try {
        await gql(requestResetMutation, { email });
    } catch {
        return { sent: false, email, error: "Serverul nu răspunde. Încearcă din nou." };
    }
    // Același răspuns fie că adresa are cont, fie că nu
    return { sent: true, email, error: null };
}

// ---------- Parola nouă, din linkul primit pe mail ----------

export type NewPasswordState = { error: string | null };

const resetMutation = `
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(input: { token: $token, newPassword: $password }) { jwtToken }
  }
`;

export async function resetPassword(_previous: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
    // Parolele nu le trimitem niciodată înapoi în pagină și nu le „curățăm” de spații
    const token = text(formData, "token");
    const password = String(formData.get("password") ?? "");
    const repeat = String(formData.get("passwordRepeat") ?? "");
    if (password.length < 8) return { error: "Parola trebuie să aibă cel puțin 8 caractere." };
    if (password !== repeat) return { error: "Parolele nu sunt identice. Scrie-le din nou." };

    let jwt: string | null;
    try {
        const data = await gql<{ resetPassword: { jwtToken: string | null } }>(resetMutation, { token, password });
        jwt = data.resetPassword.jwtToken;
    } catch (error) {
        return { error: friendlyError(error) };
    }
    if (!jwt) return { error: "Linkul nu mai este valid. Cere unul nou de la „Ai uitat parola?”." };

    const user = await fetchUser(jwt);
    if (!user) return { error: "Serverul nu răspunde. Încearcă din nou." };

    await startSession(jwt); // intră direct în cont, cu parola nouă
    redirect(homeFor(user));
}

// ---------- Confirmarea emailului, din linkul primit pe mail ----------

export type ConfirmState = { done: boolean; linkedOrders: number; error: string | null };

const verifyMutation = `
  mutation VerifyEmail($token: String!) {
    verifyEmail(input: { token: $token }) { linkedOrders }
  }
`;

export async function confirmEmail(_previous: ConfirmState, formData: FormData): Promise<ConfirmState> {
    try {
        const data = await gql<{ verifyEmail: { linkedOrders: number | null } }>(verifyMutation, {
            token: text(formData, "token"),
        });
        revalidatePath("/", "layout"); // contul nu mai arată „emailul nu e confirmat”
        return { done: true, linkedOrders: data.verifyEmail.linkedOrders ?? 0, error: null };
    } catch (error) {
        return { done: false, linkedOrders: 0, error: friendlyError(error) };
    }
}

// ---------- „Trimite linkul de confirmare”, din cont ----------

export type ResendState = { sent: boolean; error: string | null };

const resendMutation = `
  mutation RequestEmailVerification {
    requestEmailVerification(input: {}) { clientMutationId }
  }
`;

// Nu are nevoie de starea de dinainte: fiecare click trimite un mail nou
export async function resendVerification(): Promise<ResendState> {
    const { token } = await requireCustomer();
    try {
        await gql(resendMutation, {}, token);
        return { sent: true, error: null };
    } catch {
        return { sent: false, error: "Nu am putut trimite mailul acum. Încearcă din nou." };
    }
}

// ---------- Schimbarea parolei, din cont ----------

export type ChangePasswordState = { done: boolean; error: string | null };

const changeMutation = `
  mutation ChangePassword($current: String!, $password: String!) {
    changePassword(input: { currentPassword: $current, newPassword: $password }) { clientMutationId }
  }
`;

export async function changePassword(
    _previous: ChangePasswordState,
    formData: FormData,
): Promise<ChangePasswordState> {
    const { token } = await requireCustomer();
    const current = String(formData.get("currentPassword") ?? "");
    const password = String(formData.get("password") ?? "");
    const repeat = String(formData.get("passwordRepeat") ?? "");
    if (password.length < 8) return { done: false, error: "Parola nouă trebuie să aibă cel puțin 8 caractere." };
    if (password !== repeat) return { done: false, error: "Parolele noi nu sunt identice. Scrie-le din nou." };

    try {
        await gql(changeMutation, { current, password }, token);
    } catch (error) {
        return { done: false, error: friendlyError(error) };
    }
    return { done: true, error: null };
}
