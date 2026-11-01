import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { NewPasswordForm } from "@/components/account/new-password-form";

export const metadata: Metadata = {
    title: "Parolă nouă · Panos Greco",
    robots: { index: false, follow: false },
    // Tokenul stă în adresa paginii: nu-l trimitem mai departe când clientul dă click pe alt site
    referrer: "no-referrer",
};

// Tokenul din linkul de pe mail: 64 de caractere 0-9 și a-f
const TOKEN = /^[0-9a-f]{64}$/;

async function NewPassword({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
    const { token } = await searchParams;

    if (typeof token !== "string" || !TOKEN.test(token)) {
        return (
            <p className="text-sm text-neutral-700">
                Linkul nu este complet. Deschide-l din nou din mail sau{" "}
                <Link href="/cont/parola-uitata" className="font-medium text-olive underline">
                    cere unul nou
                </Link>
                .
            </p>
        );
    }
    return <NewPasswordForm token={token} />;
}

export default function NewPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
    return (
        <AuthShell title="Parolă nouă" description="Alege parola nouă. După ce o salvezi, intri direct în cont.">
            <Suspense fallback={null}>
                <NewPassword searchParams={searchParams} />
            </Suspense>
        </AuthShell>
    );
}
