import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gql } from "@/lib/catalog";

export const TOKEN_COOKIE = "panos_token";

export type CurrentUser = { email: string; role: string };

const meQuery = `query Me { me { email role } }`;

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

// Paza de la intrare: o folosim în fiecare pagină de admin
export async function requireAdmin() {
    const token = await getToken();
    if (!token) redirect("/admin/login");

    const user = await fetchUser(token);
    if (!user || user.role === "client") redirect("/admin/login");

    return { user, token };
}