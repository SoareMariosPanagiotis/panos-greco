import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account/register-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { getSession, homeFor } from "@/lib/auth";

export const metadata: Metadata = {
    title: "Creează cont · Panos Greco",
    robots: { index: false, follow: false },
};

// Cine are deja cont și e conectat nu are nevoie de încă unul
async function RedirectIfLoggedIn() {
    const session = await getSession();
    if (session) redirect(homeFor(session.user));
    return null;
}

export default function RegisterPage() {
    return (
        <main className="flex flex-1 items-center justify-center px-4 py-16">
            <Suspense fallback={null}>
                <RedirectIfLoggedIn />
            </Suspense>

            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Creează cont</CardTitle>
                    <CardDescription>
                        Ca să vezi oricând comenzile tale. Poți comanda și fără cont.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RegisterForm />
                    <p className="mt-6 text-center text-sm text-neutral-600">
                        Ai deja cont?{" "}
                        <Link href="/cont/intra" className="font-medium text-olive hover:underline">
                            Intră în cont
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
