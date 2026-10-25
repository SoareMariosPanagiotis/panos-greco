"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gql } from "@/lib/catalog";
import { fetchUser, TOKEN_COOKIE } from "@/lib/auth";

export type LoginState = { error: string | null; email: string };

const authenticateMutation = `
  mutation Authenticate($email: String!, $password: String!) {
    authenticate(input: { email: $email, password: $password }) {
      jwtToken
    }
  }
`;

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

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

    // Același mesaj pentru email greșit și parolă greșită (vezi explicația)
    if (!token) {
        return { error: "Email sau parolă greșită.", email };
    }

    const user = await fetchUser(token);
    if (!user || user.role === "client") {
        return { error: "Acest cont nu are acces la administrare.", email };
    }

    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, token, {
        httpOnly: true,                                // JavaScript-ul din pagină nu-l poate citi
        secure: process.env.NODE_ENV === "production", // pe server va merge doar prin HTTPS
        sameSite: "lax",                               // nu e trimis de pe alte site-uri
        path: "/",
        maxAge: 60 * 60 * 24 * 7,                      // 7 zile, la fel ca biletul
    });

    redirect("/admin");
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(TOKEN_COOKIE);
    redirect("/admin/login");
}