import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCT_LABEL_FIELDS, ProductLabel, type ProductLabelData } from "@/components/product-label";
import { ProductShowcase } from "@/components/product-showcase";
import { Badge } from "@/components/ui/badge";
import { formatSize, gql, type ProductDetails } from "@/lib/catalog";
import { PRODUCT_IMAGE_FIELDS, type ProductImage } from "@/lib/product-images";

const query = `
  query ProductPage($slug: String!) {
    productBySlug(slug: $slug) {
      name
      description
      isOrganic
      categoryByCategoryId { name }
      ${PRODUCT_IMAGE_FIELDS}
      productVariantsByProductId(orderBy: PACK_SIZE_ASC) {
        nodes { id packSize packUnit price }
      }
      ${PRODUCT_LABEL_FIELDS}
    }
  }
`;

async function ProductView({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = await gql<{
        productBySlug:
            | (ProductDetails & ProductLabelData & { productImagesByProductId: { nodes: ProductImage[] } })
            | null;
    }>(query, { slug });
    const product = data.productBySlug;

    if (!product) notFound();

    return (
        <>
            {/* Sus: tot ce trebuie ca să cumperi, fără scroll */}
            <ProductShowcase
                images={product.productImagesByProductId.nodes}
                variants={product.productVariantsByProductId.nodes}
                productName={product.name}
                productSlug={slug}
            >
                <p className="text-sm text-neutral-500">{product.categoryByCategoryId?.name}</p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{product.name}</h1>
                {product.isOrganic && <Badge className="mt-3 bg-green-700 text-white">BIO</Badge>}
            </ProductShowcase>

            {/* Jos: povestea și detaliile, pentru cine vrea să citească */}
            {product.description && (
                <section className="mt-10 border-t pt-8 sm:mt-16 sm:pt-10">
                    <h2 className="text-xl font-bold text-olive sm:text-2xl">Descriere</h2>
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
        // Pe telefon margini de 16 px (px-4); de la sm, ca pe calculator
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
            <Link href="/" className="text-sm text-olive hover:underline">
                ← Înapoi la produse
            </Link>
            <Suspense fallback={<p className="mt-6">Se încarcă produsul...</p>}>
                <ProductView params={params} />
            </Suspense>
        </main>
    );
}