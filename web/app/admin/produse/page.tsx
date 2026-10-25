import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { gql } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";

type AdminProductRow = {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    isOrganic: boolean;
    categoryByCategoryId: { name: string } | null;
    productVariantsByProductId: { nodes: { stock: number }[] };
};

// Fără "condition: isActive", adminul vede și produsele ascunse
const query = `
  query AdminProducts {
    allProducts(orderBy: NAME_ASC) {
      nodes {
        id
        name
        slug
        isActive
        isOrganic
        categoryByCategoryId { name }
        productVariantsByProductId { nodes { stock } }
      }
    }
  }
`;

async function ProductTable() {
    const { token } = await requireAdmin();
    const data = await gql<{ allProducts: { nodes: AdminProductRow[] } }>(query, {}, token);
    const products = data.allProducts.nodes;

    return (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
                <thead className="border-b bg-neutral-50 text-neutral-500">
                <tr>
                    <th className="px-4 py-3 font-medium">Produs</th>
                    <th className="px-4 py-3 font-medium">Categorie</th>
                    <th className="px-4 py-3 text-right font-medium">Mărimi</th>
                    <th className="px-4 py-3 text-right font-medium">Stoc total</th>
                    <th className="px-4 py-3 font-medium">Stare</th>
                </tr>
                </thead>
                <tbody className="divide-y">
                {products.map((product) => {
                    const variants = product.productVariantsByProductId.nodes;
                    const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);

                    return (
                        <tr key={product.id} className="hover:bg-olive-light">
                            <td className="px-4 py-3">
                                <Link
                                    href={`/admin/produse/${product.slug}`}
                                    className="font-medium text-olive hover:underline"
                                >
                                    {product.name}
                                </Link>
                                {product.isOrganic && (
                                    <Badge className="ml-2 bg-green-700 text-white">BIO</Badge>
                                )}
                            </td>
                            <td className="px-4 py-3 text-neutral-600">{product.categoryByCategoryId?.name}</td>
                            <td className="px-4 py-3 text-right">{variants.length}</td>
                            <td
                                className={`px-4 py-3 text-right font-medium ${
                                    totalStock === 0 ? "text-red-600" : ""
                                }`}
                            >
                                {totalStock}
                            </td>
                            <td className="px-4 py-3">
                                {product.isActive ? "Activ" : <span className="text-neutral-400">Ascuns</span>}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminProductsPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/admin" className="text-sm text-olive hover:underline">
                ← Administrare
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Produse</h1>
            <Suspense fallback={<p className="mt-6">Se încarcă produsele...</p>}>
                <ProductTable />
            </Suspense>
        </main>
    );
}