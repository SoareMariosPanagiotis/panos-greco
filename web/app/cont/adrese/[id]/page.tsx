import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddressForm } from "@/components/account/address-form";
import { requireCustomer } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { SAVED_ADDRESS_FIELDS, type SavedAddress } from "@/lib/customer";

export const metadata: Metadata = {
    title: "Modifică adresa · Panos Greco",
    robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f-]{36}$/i;

const query = `
  query MyAddress($id: UUID!) {
    customerAddressById(id: $id) { ${SAVED_ADDRESS_FIELDS} }
  }
`;

async function EditAddress({ params }: { params: Promise<{ id: string }> }) {
    const { token } = await requireCustomer();
    const { id } = await params;
    if (!UUID.test(id)) notFound();

    // RLS: adresa altcuiva vine înapoi ca null, la fel ca una care nu există
    const data = await gql<{ customerAddressById: SavedAddress | null }>(query, { id }, token);
    if (!data.customerAddressById) notFound();

    return <AddressForm address={data.customerAddressById} />;
}

export default function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <main className="mx-auto w-full max-w-xl px-8 py-10">
            <Link href="/cont/adrese" className="text-sm text-olive hover:underline">
                ← Adresele mele
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Modifică adresa</h1>
            <Suspense fallback={<p className="mt-6">Se încarcă...</p>}>
                <EditAddress params={params} />
            </Suspense>
        </main>
    );
}
