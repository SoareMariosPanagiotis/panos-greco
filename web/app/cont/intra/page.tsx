import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account/login-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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

            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Intră în cont</CardTitle>
                    <CardDescription>Vezi comenzile tale și comanzi mai repede.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginForm />
                    <p className="mt-6 text-center text-sm text-neutral-600">
                        Nu ai cont?{" "}
                        <Link href="/cont/creare" className="font-medium text-olive hover:underline">
                            Creează unul acum
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}