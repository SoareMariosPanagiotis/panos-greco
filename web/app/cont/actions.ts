"use server";

import { redirect } from "next/navigation";
import { gql } from "@/lib/catalog";
import { endSession, fetchUser, homeFor, startSession } from "@/lib/auth";

function text(formData: FormData, name: string) {
    return String(formData.get(name) ?? "").trim();
}

// Mesajele scrise de noi în baza de date sunt deja pe înțelesul clientului.
// Erorile tehnice, neprevăzute, le înlocuim cu un mesaj general.
function friendlyError(message: string) {
    const technical = ["syntax", "violates", "permission", "relation", "function", "cannot", "fetch failed"];
    if (technical.some((word) => message.toLowerCase().includes(word))) {
        return "A apărut o problemă. Încearcă din nou peste câteva momente.";
    }
    return message;
}

// ---------- Intră în cont: o singură ușă pentru toată lumea ----------

export type LoginState = { error: string | null; email: string };

const authenticateMutation = `
  mutation Authenticate($email: String!, $password: String!) {
    authenticate(input: { email: $email, password: $password }) {
      jwtToken
    }
  }
`;

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
    const email = text(formData, "email");
    const password = String(formData.get("password") ?? ""); // parola o lăsăm exact cum a fost scrisă

    if (!email || !password) {
        return { error: "Completează emailul și parola.", email };
    }

    let token: string | null;
    try {
        const data = await gql<{ authenticate: { jwtToken: string | null } }>(
            authenticateMutation,
            { email, password },
        );
        token = data.authenticate.jwtToken;
    } catch {
        return { error: "Serverul nu răspunde. Încearcă din nou.", email };
    }

    // Același mesaj pentru email greșit și parolă greșită
    if (!token) {
        return { error: "Email sau parolă greșită.", email };
    }

    const user = await fetchUser(token);
    if (!user) {
        return { error: "Serverul nu răspunde. Încearcă din nou.", email };
    }

    await startSession(token);
    redirect(homeFor(user)); // clientul ajunge în „Contul meu”, adminul în administrare
}

// ---------- Creează cont ----------

export type CreateAccountValues = { fullName: string; email: string; acceptTerms: boolean };
export type CreateAccountState = { error: string | null; values: CreateAccountValues };

const registerMutation = `
  mutation Register($fullName: String!, $email: String!, $password: String!) {
    register(input: { fullName: $fullName, email: $email, password: $password }) {
      jwtToken
    }
  }
`;

export async function createAccount(
    _previous: CreateAccountState,
    formData: FormData,
): Promise<CreateAccountState> {
    // Parolele NU intră în values: nu le trimitem niciodată înapoi în pagină
    const values: CreateAccountValues = {
        fullName: text(formData, "fullName"),
        email: text(formData, "email"),
        acceptTerms: formData.get("acceptTerms") === "on",
    };
    const password = String(formData.get("password") ?? "");
    const passwordRepeat = String(formData.get("passwordRepeat") ?? "");

    // Capcană pentru roboți, la fel ca la comandă
    if (text(formData, "website")) {
        return { error: "Contul nu a putut fi creat.", values };
    }
    if (values.fullName.length < 2) {
        return { error: "Completează numele și prenumele.", values };
    }
    if (!values.email) {
        return { error: "Completează adresa de email.", values };
    }
    if (password.length < 8) {
        return { error: "Parola trebuie să aibă cel puțin 8 caractere.", values };
    }
    if (password !== passwordRepeat) {
        return { error: "Parolele nu sunt identice. Scrie-le din nou.", values };
    }
    if (!values.acceptTerms) {
        return { error: "Trebuie să accepți termenii și condițiile.", values };
    }

    // Trimitem DOAR numele, emailul și parola. Rolul îl scrie baza de date: mereu client.
    let token: string | null;
    try {
        const data = await gql<{ register: { jwtToken: string | null } }>(registerMutation, {
            fullName: values.fullName,
            email: values.email,
            password,
        });
        token = data.register.jwtToken;
    } catch (error) {
        return { error: friendlyError((error as Error).message), values };
    }
    if (!token) {
        return { error: "Contul nu a putut fi creat. Încearcă din nou.", values };
    }

    await startSession(token); // intră direct în cont, nu mai scrie parola încă o dată
    redirect("/cont");
}

// ---------- Ieși din cont ----------

export async function logout() {
    await endSession();
    redirect("/");
}