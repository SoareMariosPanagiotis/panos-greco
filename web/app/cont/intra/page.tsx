import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/account/auth-form";
import { getSession, homeFor } from "@/lib/auth";

export const metadata: Metadata = {
    title: "Intră în cont · Panos Greco",
    robots: { index: false, follow: false },
};

// Cine e deja conectat nu mai are ce căuta aici: îl trimitem direct „acasă”
async function RedirectIfLoggedIn() {
    const session = await getSession();
    if (session) redirect(homeFor(session.user));
    return null;
}

export default function LoginPage() {
    return (
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
            {/* Doar verificarea citește cookie-ul; formularul se afișează imediat */}
            <Suspense fallback={null}>
                <RedirectIfLoggedIn />
            </Suspense>

            {/* Logo-ul duce înapoi la produse, ca peste tot pe site.
                width/height = mărimea reală a fișierului SVG; pe ecran mărimea o dă clasa h-28 */}
            <Link href="/">
                <Image
                    src="/logo.svg"
                    alt="Panos Greco"
                    width={496}
                    height={412}
                    loading="eager"
                    className="h-28 w-auto"
                />
            </Link>

            {/* O singură ușă: emailul întâi, apoi parola sau cont nou */}
            <AuthForm />
        </main>
    );
}
