import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gql } from "@/lib/catalog";

export const TOKEN_COOKIE = "panos_token";

export type CurrentUser = { email: string; role: string; fullName: string | null };
export type Session = { user: CurrentUser; token: string };

const meQuery = `query Me { me { email role fullName } }`;

// Citește biletul din cookie (doar pe server)
export async function getToken() {
    const cookieStore = await cookies();
    return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}

// Întreabă API-ul "cine sunt eu?" folosind biletul
export async function fetchUser(token: string): Promise<CurrentUser | null> {
    try {
        const data = await gql<{ me: CurrentUser | null }>(meQuery, {}, token);
        return data.me;
    } catch {
        return null; // bilet expirat sau invalid
    }
}

// Cine e conectat acum? null = nimeni (sau biletul a expirat).
// cache() = în timpul aceleiași cereri întrebăm API-ul o singură dată,
// chiar dacă și meniul, și pagina vor să știe cine ești.
export const getSession = cache(async (): Promise<Session | null> => {
    const token = await getToken();
    if (!token) return null;

    const user = await fetchUser(token);
    return user ? { user, token } : null;
});

// Unde ajunge fiecare după ce intră în cont
export function homeFor(user: CurrentUser) {
    return user.role === "client" ? "/cont" : "/admin";
}

// Prenumele, pentru „Salut, Marios”
export function firstName(user: CurrentUser) {
    return user.fullName?.split(" ")[0] ?? null;
}

// Pune biletul în cookie. Merge doar din Server Actions.
export async function startSession(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, token, {
        httpOnly: true,                                // JavaScript-ul din pagină nu-l poate citi
        secure: process.env.NODE_ENV === "production", // pe server va merge doar prin HTTPS
        sameSite: "lax",                               // nu e trimis de pe alte site-uri
        path: "/",
        maxAge: 60 * 60 * 24 * 7,                      // 7 zile, la fel ca biletul
    });
}

// Ieșirea din cont: aruncăm biletul
export async function endSession() {
    const cookieStore = await cookies();
    cookieStore.delete(TOKEN_COOKIE);
}

// Paza de la intrarea în administrare
export async function requireAdmin() {
    const session = await getSession();
    if (!session || session.user.role === "client") redirect("/cont/intra");
    return session;
}

// Paza de la intrarea în „Contul meu”
export async function requireCustomer() {
    const session = await getSession();
    if (!session) redirect("/cont/intra");
    if (session.user.role !== "client") redirect("/admin");
    return session;
}