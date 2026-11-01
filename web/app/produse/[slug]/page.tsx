import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCT_LABEL_FIELDS, ProductLabel, type ProductLabelData } from "@/components/product-label";
import { Badge } from "@/components/ui/badge";
import { VariantPicker } from "@/components/variant-picker";
import { formatSize, gql, type ProductDetails } from "@/lib/catalog";

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
      ${PRODUCT_LABEL_FIELDS}
    }
  }
`;

async function ProductView({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = await gql<{ productBySlug: (ProductDetails & ProductLabelData) | null }>(query, { slug });
    const product = data.productBySlug;

    if (!product) notFound();

    return (
        <>
            {/* Sus: tot ce trebuie ca să cumperi, fără scroll */}
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

                    <VariantPicker
                        productName={product.name}
                        productSlug={slug}
                        variants={product.productVariantsByProductId.nodes}
                    />
                </div>
            </div>

            {/* Jos: povestea și detaliile, pentru cine vrea să citească */}
            {product.description && (
                <section className="mt-16 border-t pt-10">
                    <h2 className="text-2xl font-bold text-olive">Descriere</h2>
                    <p className="mt-4 max-w-3xl whitespace-pre-line leading-relaxed text-neutral-700">
                        {product.description}
                    </p>
                </section>
            )}

            {/* Eticheta: ingrediente, alergeni, valori nutriționale (migrația 025) */}
            <ProductLabel
                label={product}
                sizes={product.productVariantsByProductId.nodes.map((variant) =>
                    formatSize(variant.packSize, variant.packUnit),
                )}
            />
        </>
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