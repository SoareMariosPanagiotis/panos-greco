import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DeleteProductForm } from "@/components/admin/delete-product-form";
import { NewVariantForm } from "@/components/admin/new-variant-form";
import { ProductDetailsForm } from "@/components/admin/product-details-form";
import { ProductImagesManager } from "@/components/admin/product-images-manager";
import { ProductLabelForm } from "@/components/admin/product-label-form";
import { VariantEditRow, type AdminVariant } from "@/components/admin/variant-edit-row";
import { gql } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";
import { PRODUCT_IMAGE_FIELDS, type ProductImage } from "@/lib/product-images";

type AdminProduct = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    isOrganic: boolean;
    vatRate: string;
    categoryId: string;
    categoryByCategoryId: { name: string } | null;
    productVariantsByProductId: { nodes: AdminVariant[] };
    productImagesByProductId: { nodes: ProductImage[] }; // galeria (migrația 032)
    // Eticheta (migrația 025)
    ingredients: string | null;
    mayContain: string | null;
    storage: string | null;
    usageNotes: string | null;
    origin: string | null;
    producer: string | null;
    organicCode: string | null;
    labelNotes: string | null;
    productNutritionByProductId: Nutrition | null;
};

type Nutrition = {
    basis: string;
    energyKj: string;
    energyKcal: string;
    fat: string;
    saturates: string;
    carbohydrate: string;
    sugars: string;
    fibre: string | null;
    protein: string;
    salt: string;
};

// Postgres trimite „91.60”; în formular e mai curat „91.6”
function plain(value: string | null | undefined) {
    return value === null || value === undefined ? "" : String(Number(value));
}

type Category = { id: string; name: string };

const query = `
  query AdminProduct($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      slug
      description
      isActive
      isOrganic
      vatRate
      categoryId
      categoryByCategoryId { name }
      ${PRODUCT_IMAGE_FIELDS}
      productVariantsByProductId(orderBy: PACK_SIZE_ASC) {
        nodes { id packSize packUnit price stock barcode }
      }
      ingredients mayContain storage usageNotes origin producer organicCode labelNotes
      productNutritionByProductId {
        basis energyKj energyKcal fat saturates carbohydrate sugars fibre protein salt
      }
    }
    allCategories(orderBy: SORT_ORDER_ASC) {
      nodes { id name }
    }
  }
`;

async function ProductEditor({ params }: { params: Promise<{ slug: string }> }) {
    const { token } = await requireAdmin();
    const { slug } = await params;
    const data = await gql<{
        productBySlug: AdminProduct | null;
        allCategories: { nodes: Category[] };
    }>(query, { slug }, token);
    const product = data.productBySlug;

    if (!product) notFound();

    const variants = product.productVariantsByProductId.nodes;
    const nutrition = product.productNutritionByProductId;

    return (
        <>
            <p className="mt-6 text-sm text-neutral-500">{product.categoryByCategoryId?.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold">{product.name}</h1>
                {product.isOrganic && <Badge className="bg-green-700 text-white">BIO</Badge>}
                {!product.isActive && <Badge variant="outline">Ascuns</Badge>}
            </div>
            <p className="mt-2 text-sm text-neutral-500">
                {product.isActive ? (
                    <Link href={`/produse/${product.slug}`} className="text-olive hover:underline">
                        vezi pe site
                    </Link>
                ) : (
                    "Produsul nu apare pe site."
                )}
            </p>

            <h2 className="mt-8 font-semibold">Detalii</h2>
            <div className="mt-3">
                <ProductDetailsForm
                    productId={product.id}
                    categories={data.allCategories.nodes}
                    initial={{
                        name: product.name,
                        description: product.description ?? "",
                        categoryId: product.categoryId,
                        vatRate: String(Number(product.vatRate)),
                        isOrganic: product.isOrganic,
                        isActive: product.isActive,
                    }}
                />
            </div>

            <h2 className="mt-10 font-semibold">Poze</h2>
            <div className="mt-3">
                <ProductImagesManager
                    productId={product.id}
                    productName={product.name}
                    images={product.productImagesByProductId.nodes}
                />
            </div>

            <h2 className="mt-10 font-semibold">Mărimi, prețuri și stoc</h2>
            <div className="mt-3 rounded-xl border bg-white">
                <div className="hidden gap-4 border-b px-4 py-3 text-sm text-neutral-500 md:grid md:grid-cols-[1fr_140px_120px_110px_90px]">
                    <span>Mărime</span>
                    <span>Preț (lei, cu TVA)</span>
                    <span>Stoc (buc.)</span>
                    <span />
                    <span />
                </div>
                {variants.map((variant) => (
                    <VariantEditRow
                        key={variant.id}
                        variant={variant}
                        productId={product.id}
                        canDelete={variants.length > 1}
                    />
                ))}
            </div>
            <NewVariantForm productId={product.id} />

            <h2 className="mt-10 font-semibold">Eticheta</h2>
            <p className="mt-1 text-sm text-neutral-500">
                La vânzarea online, clientul trebuie să vadă înainte să cumpere tot ce e obligatoriu pe etichetă (în
                afară de data expirării). Copiază de pe etichetă; câmpurile goale nu apar pe site.
            </p>
            <div className="mt-3">
                <ProductLabelForm
                    productId={product.id}
                    initial={{
                        ingredients: product.ingredients ?? "",
                        mayContain: product.mayContain ?? "",
                        storage: product.storage ?? "",
                        usageNotes: product.usageNotes ?? "",
                        origin: product.origin ?? "",
                        producer: product.producer ?? "",
                        organicCode: product.organicCode ?? "",
                        labelNotes: product.labelNotes ?? "",
                        basis: nutrition?.basis ?? "100 g",
                        energyKj: plain(nutrition?.energyKj),
                        energyKcal: plain(nutrition?.energyKcal),
                        fat: plain(nutrition?.fat),
                        saturates: plain(nutrition?.saturates),
                        carbohydrate: plain(nutrition?.carbohydrate),
                        sugars: plain(nutrition?.sugars),
                        fibre: plain(nutrition?.fibre),
                        protein: plain(nutrition?.protein),
                        salt: plain(nutrition?.salt),
                    }}
                />
            </div>

            <div className="mt-16">
                <DeleteProductForm productId={product.id} productName={product.name} />
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