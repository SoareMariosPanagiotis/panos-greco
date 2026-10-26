import { Suspense } from "react";
import Link from "next/link";
import { NewProductForm } from "@/components/admin/new-product-form";
import { gql } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";

const query = `
  query Categories {
    allCategories(orderBy: SORT_ORDER_ASC) {
      nodes { id name }
    }
  }
`;

async function NewProductLoader() {
    const { token } = await requireAdmin();
    const data = await gql<{ allCategories: { nodes: { id: string; name: string }[] } }>(
        query,
        {},
        token,
    );
    return <NewProductForm categories={data.allCategories.nodes} />;
}

export default function NewProductPage() {
    return (
        <main className="mx-auto w-full max-w-4xl px-8 py-10">
            <Link href="/admin/produse" className="text-sm text-olive hover:underline">
                ← Toate produsele
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Produs nou</h1>
            <div className="mt-6">
                <Suspense fallback={<p>Se încarcă...</p>}>
                    <NewProductLoader />
                </Suspense>
            </div>
        </main>
    );
}