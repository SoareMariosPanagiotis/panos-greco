import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Rama comună pentru paginile de cont fără meniu: logo-ul sus, apoi un card cu titlu.
// O folosesc „Ai uitat parola?”, „Parolă nouă” și „Confirmă emailul”, ca să arate la fel ca intrarea în cont.
export function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
            <Link href="/">
                <Image src="/logo.svg" alt="Panos Greco" width={496} height={412} loading="eager" className="h-28 w-auto" />
            </Link>
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>{children}</CardContent>
            </Card>
        </main>
    );
}
