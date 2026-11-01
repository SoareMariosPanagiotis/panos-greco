import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/account/auth-shell";
import { ForgotPasswordForm } from "@/components/account/forgot-password-form";

export const metadata: Metadata = {
    title: "Ai uitat parola? · Panos Greco",
    robots: { index: false, follow: false },
};

// Emailul vine din pagina de intrare („Ai uitat parola?”), ca să nu-l mai scrie o dată
async function ForgotPassword({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
    const { email } = await searchParams;
    return <ForgotPasswordForm defaultEmail={typeof email === "string" ? email : ""} />;
}

export default function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
    return (
        <AuthShell
            title="Ai uitat parola?"
            description="Scrie adresa de email a contului și îți trimitem un link pentru o parolă nouă."
        >
            <Suspense fallback={null}>
                <ForgotPassword searchParams={searchParams} />
            </Suspense>
        </AuthShell>
    );
}
