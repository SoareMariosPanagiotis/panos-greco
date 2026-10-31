"use server";

import { redirect } from "next/navigation";
import { gql } from "@/lib/catalog";
import { endSession, fetchUser, homeFor, startSession } from "@/lib/auth";

// Formularul de intrare e o mică mașină de stări, ca la comenzi:
//   email → password (are deja cont)
//   email → register (cont nou)
export type AuthStep = "email" | "password" | "register";

export type AuthState = {
    step: AuthStep;
    email: string;
    error: string | null;
    // Ce a completat deja la „cont nou”, ca să nu scrie din nou după o greșeală
    firstName: string;
    lastName: string;
    acceptTerms: boolean;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function text(formData: FormData, name: string) {
    return String(formData.get(name) ?? "").trim();
}

// Starea pentru un pas, cu câmpurile de „cont nou” goale
function stateFor(step: AuthStep, email: string, error: string | null = null): AuthState {
    return { step, email, error, firstName: "", lastName: "", acceptTerms: false };
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

// ---------- Pasul 1: există un cont cu emailul ăsta? ----------

const accountExistsQuery = `
  query AccountExists($email: String!) {
    accountExists(email: $email)
  }
`;

async function checkEmail(email: string): Promise<AuthState> {
    if (!EMAIL.test(email)) {
        return stateFor("email", email, "Scrie o adresă de email validă.");
    }

    try {
        const data = await gql<{ accountExists: boolean }>(accountExistsQuery, { email });
        return stateFor(data.accountExists ? "password" : "register", email);
    } catch {
        return stateFor("email", email, "Serverul nu răspunde. Încearcă din nou.");
    }
}

// ---------- Pasul 2a: are cont → verificăm parola ----------

const authenticateMutation = `
  mutation Authenticate($email: String!, $password: String!) {
    authenticate(input: { email: $email, password: $password }) {
      jwtToken
    }
  }
`;

async function checkPassword(email: string, formData: FormData): Promise<AuthState> {
    const password = String(formData.get("password") ?? ""); // parola o lăsăm exact cum a fost scrisă
    if (!password) {
        return stateFor("password", email, "Scrie parola.");
    }

    let token: string | null;
    try {
        const data = await gql<{ authenticate: { jwtToken: string | null } }>(
            authenticateMutation,
            { email, password },
        );
        token = data.authenticate.jwtToken;
    } catch {
        return stateFor("password", email, "Serverul nu răspunde. Încearcă din nou.");
    }

    // La pasul 1 am spus deja că emailul are cont, deci putem spune exact ce e greșit
    if (!token) {
        return stateFor("password", email, "Parola nu este corectă.");
    }

    const user = await fetchUser(token);
    if (!user) {
        return stateFor("password", email, "Serverul nu răspunde. Încearcă din nou.");
    }

    await startSession(token);
    redirect(homeFor(user)); // clientul ajunge în „Contul meu”, adminul în administrare
}

// ---------- Pasul 2b: cont nou ----------

const registerMutation = `
  mutation Register($firstName: String!, $lastName: String!, $email: String!, $password: String!) {
    register(input: { firstName: $firstName, lastName: $lastName, email: $email, password: $password }) {
      jwtToken
    }
  }
`;

async function createAccount(email: string, formData: FormData): Promise<AuthState> {
    // Parolele NU intră în stare: nu le trimitem niciodată înapoi în pagină
    const filled = {
        firstName: text(formData, "firstName"),
        lastName: text(formData, "lastName"),
        acceptTerms: formData.get("acceptTerms") === "on",
    };
    const password = String(formData.get("password") ?? "");
    const passwordRepeat = String(formData.get("passwordRepeat") ?? "");
    const fail = (error: string): AuthState => ({ step: "register", email, error, ...filled });

    // Capcană pentru roboți, la fel ca la comandă
    if (text(formData, "website")) return fail("Contul nu a putut fi creat.");
    if (!filled.lastName) return fail("Completează numele.");
    if (!filled.firstName) return fail("Completează prenumele.");
    if (password.length < 8) return fail("Parola trebuie să aibă cel puțin 8 caractere.");
    if (password !== passwordRepeat) return fail("Parolele nu sunt identice. Scrie-le din nou.");
    if (!filled.acceptTerms) return fail("Trebuie să accepți termenii și condițiile.");

    // Trimitem DOAR numele, emailul și parola. Rolul îl scrie baza de date: mereu client.
    let token: string | null;
    try {
        const data = await gql<{ register: { jwtToken: string | null } }>(registerMutation, {
            firstName: filled.firstName,
            lastName: filled.lastName,
            email,
            password,
        });
        token = data.register.jwtToken;
    } catch (error) {
        return fail(friendlyError((error as Error).message));
    }
    if (!token) return fail("Contul nu a putut fi creat. Încearcă din nou.");

    await startSession(token); // intră direct în cont, nu mai scrie parola încă o dată
    redirect("/cont");
}

// ---------- Ușa de la intrare: fiecare formular spune ce pas trimite ----------

export async function continueAuth(_previous: AuthState, formData: FormData): Promise<AuthState> {
    const intent = text(formData, "intent");
    const email = text(formData, "email").toLowerCase();

    switch (intent) {
        case "check-email":
            return checkEmail(email);
        case "login":
            return checkPassword(email, formData);
        case "register":
            return createAccount(email, formData);
        default:
            // „Schimbă” lângă email: înapoi la primul pas, cu emailul deja scris
            return stateFor("email", email);
    }
}

// ---------- Ieși din cont ----------

export async function logout() {
    await endSession();
    redirect("/");
}
