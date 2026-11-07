import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { requireCustomer } from "@/lib/auth";

export const metadata: Metadata = {
    title: "Datele mele · Panos Greco",
    robots: { index: false, follow: false },
};

async function ProfileLoader() {
    const { user } = await requireCustomer();

    return (
        <>
            <ProfileForm
                email={user.email}
                lastName={user.lastName ?? ""}
                firstName={user.firstName ?? ""}
                phone={user.phone ?? ""}
            />
            <ChangePasswordForm email={user.email} />
        </>
    );
}

export default function ProfilePage() {
    return (
        <main className="mx-auto w-full max-w-xl px-4 py-6 sm:px-8 sm:py-10">
            <Link href="/cont" className="text-sm text-olive hover:underline">
                ← Contul meu
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Datele mele</h1>
            <Suspense fallback={<p className="mt-6">Se încarcă...</p>}>
                <ProfileLoader />
            </Suspense>
        </main>
    );
}
