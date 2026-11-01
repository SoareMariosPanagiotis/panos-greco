import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { ConfirmEmailForm } from "@/components/account/confirm-email-form";

export const metadata: Metadata = {
    title: "Confirmă emailul · Panos Greco",
    robots: { index: false, follow: false },
    // Tokenul stă în adresa paginii: nu-l trimitem mai departe când clientul dă click pe alt site
    referrer: "no-referrer",
};

const TOKEN = /^[0-9a-f]{64}$/;

async function ConfirmEmail({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
    const { token } = await searchParams;

    if (typeof token !== "string" || !TOKEN.test(token)) {
        return (
            <p className="text-sm text-neutral-700">
                Linkul nu este complet. Deschide-l din nou din mail sau{" "}
                <Link href="/cont" className="font-medium text-olive underline">
                    intră în cont
                </Link>{" "}
                și cere unul nou.
            </p>
        );
    }
    return <ConfirmEmailForm token={token} />;
}

export default function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
    return (
        <AuthShell
            title="Confirmă adresa de email"
            description="Un singur click și adresa ta de email e confirmată."
        >
            <Suspense fallback={null}>
                <ConfirmEmail searchParams={searchParams} />
            </Suspense>
        </AuthShell>
    );
}
