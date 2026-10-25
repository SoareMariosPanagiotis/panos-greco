import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { VariantEditRow, type AdminVariant } from "@/components/admin/variant-edit-row";
import { gql } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";

type AdminProduct = {
    name: string;
    slug: string;
    isActive: boolean;
    isOrganic: boolean;
    vatRate: string;
    categoryByCategoryId: { name: string } | null;
    productVariantsByProductId: { nodes: AdminVariant[] };
};

const query = `
  query AdminProduct($slug: String!) {
    productBySlug(slug: $slug) {
      name
      slug
      isActive
      isOrganic
      vatRate
      categoryByCategoryId { name }
      productVariantsByProductId(orderBy: PACK_SIZE_ASC) {
        nodes { id packSize packUnit price stock barcode }
      }
    }
  }
`;

async function ProductEditor({ params }: { params: Promise<{ slug: string }> }) {
    const { token } = await requireAdmin();
    const { slug } = await params;
    const data = await gql<{ productBySlug: AdminProduct | null }>(query, { slug }, token);
    const product = data.productBySlug;

    if (!product) notFound();

    return (
        <>
            <p className="mt-6 text-sm text-neutral-500">{product.categoryByCategoryId?.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold">{product.name}</h1>
                {product.isOrganic && <Badge className="bg-green-700 text-white">BIO</Badge>}
                {!product.isActive && <Badge variant="outline">Ascuns</Badge>}
            </div>
            <p className="mt-2 text-sm text-neutral-500">
                TVA {Number(product.vatRate)}% ·{" "}
                <Link href={`/produse/${product.slug}`} className="text-olive hover:underline">
                    vezi pe site
                </Link>
            </p>

            <h2 className="mt-8 font-semibold">Mărimi, prețuri și stoc</h2>
            <div className="mt-3 rounded-xl border bg-white">
                <div className="hidden gap-4 border-b px-4 py-3 text-sm text-neutral-500 md:grid md:grid-cols-[1fr_140px_120px_180px]">
                    <span>Mărime</span>
                    <span>Preț (lei, cu TVA)</span>
                    <span>Stoc (buc.)</span>
                    <span />
                </div>
                {product.productVariantsByProductId.nodes.map((variant) => (
                    <VariantEditRow key={variant.id} variant={variant} />
                ))}
            </div>
        </>
    );
}

export default function AdminProductPage({ params }: { params: Promise<{ slug: string }> }) {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/admin/produse" className="text-sm text-olive hover:underline">
                ← Toate produsele
            </Link>
            <Suspense fallback={<p className="mt-6">Se încarcă produsul...</p>}>
                <ProductEditor params={params} />
            </Suspense>
        </main>
    );
}