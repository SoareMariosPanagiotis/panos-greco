import { Suspense } from "react";
import type { Metadata } from "next";
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
        <main className="flex flex-1 items-center justify-center px-4 py-16">
            {/* Doar verificarea citește cookie-ul; formularul se afișează imediat */}
            <Suspense fallback={null}>
                <RedirectIfLoggedIn />
            </Suspense>

            {/* O singură ușă: emailul întâi, apoi parola sau cont nou */}
            <AuthForm />
        </main>
    );
}
