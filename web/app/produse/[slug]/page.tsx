import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeliveryHints } from "@/app/cos/actions";
import { GreekFlag } from "@/components/greek-flag";
import { OrganicSeal } from "@/components/organic-seal";
import { PRODUCT_LABEL_FIELDS, ProductLabel, type ProductLabelData } from "@/components/product-label";
import { ProductPerks } from "@/components/product-perks";
import { ProductShowcase } from "@/components/product-showcase";
import { formatSize, gql, type ProductDetails } from "@/lib/catalog";
import { certificateLinkFor } from "@/lib/organic-certificate";
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
    // Produsul și livrarea, în paralel: nu așteptăm una după alta
    const [data, hints] = await Promise.all([
        gql<{
            productBySlug:
                | (ProductDetails & ProductLabelData & { productImagesByProductId: { nodes: ProductImage[] } })
                | null;
        }>(query, { slug }),
        getDeliveryHints(),
    ]);
    const product = data.productBySlug;

    if (!product) notFound();
    // „Grecia”, „Grecia (Messinia)”: țara de origine din admin
    const greek = /^grecia/i.test(product.origin ?? "");

    return (
        <>
            {/* Sus: tot ce trebuie ca să cumperi, fără scroll */}
            <ProductShowcase
                images={product.productImagesByProductId.nodes}
                variants={product.productVariantsByProductId.nodes}
                productName={product.name}
                productSlug={slug}
                after={<ProductPerks hints={hints} />}
            >
                {/* Deasupra numelui: steagul și „Produs grecesc” (când țara de origine e Grecia), apoi categoria */}
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
                    {greek && (
                        <>
                            <span className="inline-flex items-center gap-2 font-semibold text-olive">
                                <GreekFlag className="h-3 w-[18px]" />
                                Produs grecesc
                            </span>
                            <span aria-hidden="true">·</span>
                        </>
                    )}
                    {product.categoryByCategoryId?.name}
                </p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{product.name}</h1>
                <OrganicSeal
                    isOrganic={product.isOrganic}
                    organicCode={product.organicCode}
                    origin={product.origin}
                    certificateHref={certificateLinkFor(slug, product.organicCode)}
                />
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