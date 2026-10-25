import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { VariantPicker } from "@/components/variant-picker";
import { gql, type ProductDetails } from "@/lib/catalog";

const query = `
  query ProductPage($slug: String!) {
    productBySlug(slug: $slug) {
      name
      description
      isOrganic
      imageUrl
      categoryByCategoryId { name }
      productVariantsByProductId(orderBy: PACK_SIZE_ASC) {
        nodes { id packSize packUnit price }
      }
    }
  }
`;

async function ProductView({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = await gql<{ productBySlug: ProductDetails | null }>(query, { slug });
    const product = data.productBySlug;

    if (!product) notFound();

    return (
        <div className="mt-6 grid gap-10 md:grid-cols-2">
            <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
                {product.imageUrl ? (
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-olive-light text-8xl font-bold text-olive/30">
                        {product.name[0]}
                    </div>
                )}
            </div>

            <div>
                <p className="text-sm text-neutral-500">{product.categoryByCategoryId?.name}</p>
                <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
                {product.isOrganic && (
                    <Badge className="mt-3 bg-green-700 text-white">BIO</Badge>
                )}
                {product.description && (
                    <p className="mt-4 text-neutral-700">{product.description}</p>
                )}

                <VariantPicker variants={product.productVariantsByProductId.nodes} />
            </div>
        </div>
    );
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/" className="text-sm text-olive hover:underline">
                ← Înapoi la produse
            </Link>
            <Suspense fallback={<p className="mt-6">Se încarcă produsul...</p>}>
                <ProductView params={params} />
            </Suspense>
        </main>
    );
}