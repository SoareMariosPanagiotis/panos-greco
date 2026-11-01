import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShopInfoForm } from "@/components/admin/shop-info-form";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { SHOP_INFO_FIELDS, missingShopInfo, type ShopInfo } from "@/lib/shop-info";

export const metadata: Metadata = { title: "Datele firmei · Administrare" };

const query = `query AdminShopInfo { shopInfoById(id: true) { ${SHOP_INFO_FIELDS} } }`;

async function ShopInfoEditor() {
    const { token } = await requireAdmin();
    const data = await gql<{ shopInfoById: ShopInfo | null }>(query, {}, token);
    const info = data.shopInfoById;

    if (!info) {
        return (
            <p className="mt-6 rounded-xl border bg-white p-6 text-red-700">
                Nu găsesc datele firmei. Rulează migrația 023_shop_info.sql.
            </p>
        );
    }

    const missing = missingShopInfo(info);
    return (
        <div className="mt-6 space-y-4">
            {missing.length > 0 && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                    Mai lipsesc: {missing.join(", ")}. Legea cere ca datele de identificare să fie pe site înainte de
                    lansare.
                </p>
            )}
            <ShopInfoForm info={info} />
        </div>
    );
}

export default function AdminShopInfoPage() {
    return (
        <main className="mx-auto w-full max-w-3xl px-8 py-10">
            <Link href="/admin" className="text-sm text-olive hover:underline">
                ← Administrare
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Datele firmei</h1>
            <p className="mt-1 text-neutral-600">
                Apar în subsolul site-ului, pe pagina Contact, în Termeni și condiții și în mailurile de retur.
            </p>
            <Suspense fallback={<p className="mt-6">Se încarcă...</p>}>
                <ShopInfoEditor />
            </Suspense>
        </main>
    );
}
