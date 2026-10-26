import { Suspense } from "react";
import Link from "next/link";
import { CategoryRow, type AdminCategory } from "@/components/admin/category-row";
import { NewCategoryForm } from "@/components/admin/new-category-form";
import { gql } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";

const query = `
  query AdminCategories {
    allCategories(orderBy: SORT_ORDER_ASC) {
      nodes {
        id
        name
        slug
        sortOrder
        productsByCategoryId { totalCount }
      }
    }
  }
`;

async function CategoryManager() {
    const { token } = await requireAdmin();
    const data = await gql<{ allCategories: { nodes: AdminCategory[] } }>(query, {}, token);
    const categories = data.allCategories.nodes;

    // Propunem pentru categoria nouă ordinea de după ultima existentă
    const nextSortOrder = categories.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1;

    return (
        <>
            <div className="mt-6">
                <NewCategoryForm nextSortOrder={nextSortOrder} />
            </div>

            <div className="mt-8 rounded-xl border bg-white">
                <div className="hidden gap-4 border-b px-4 py-3 text-sm text-neutral-500 md:grid md:grid-cols-[1fr_100px_110px_90px]">
                    <span>Nume</span>
                    <span>Ordine</span>
                    <span />
                    <span />
                </div>
                {categories.map((category) => (
                    <CategoryRow key={category.id} category={category} />
                ))}
            </div>

            <p className="mt-3 text-sm text-neutral-500">
                Numărul mai mic apare primul în meniul site-ului. Categoriile fără produse nu apar pe site.
            </p>
        </>
    );
}

export default function AdminCategoriesPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/admin" className="text-sm text-olive hover:underline">
                ← Administrare
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Categorii</h1>
            <Suspense fallback={<p className="mt-6">Se încarcă categoriile...</p>}>
                <CategoryManager />
            </Suspense>
        </main>
    );
}