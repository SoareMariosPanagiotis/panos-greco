import { Suspense } from "react";
import Link from "next/link";
import { ProductTile } from "@/components/product-tile";
import { gql, type ProductTileData } from "@/lib/catalog";

// Câmpurile unui card, scrise o singură dată și refolosite în ambele interogări
const tileFields = `
  fragment TileFields on Product {
    id
    name
    slug
    isOrganic
    imageUrl
    cheapest: productVariantsByProductId(orderBy: PRICE_ASC, first: 1) {
      totalCount
      nodes { price }
    }
  }
`;

const allProductsQuery = `
  ${tileFields}
  query AllProducts {
    allProducts(orderBy: NAME_ASC, condition: { isActive: true }) {
      nodes { ...TileFields }
    }
  }
`;

const categoryProductsQuery = `
  ${tileFields}
  query CategoryProducts($slug: String!) {
    categoryBySlug(slug: $slug) {
      productsByCategoryId(orderBy: NAME_ASC, condition: { isActive: true }) {
        nodes { ...TileFields }
      }
    }
  }
`;

const categoriesQuery = `
  query Categories {
    allCategories(orderBy: SORT_ORDER_ASC) {
      nodes {
        name
        slug
        productsByCategoryId(condition: { isActive: true }) { totalCount }
      }
    }
  }
`;

type Category = {
    name: string;
    slug: string;
    productsByCategoryId: { totalCount: number };
};

type SearchParams = Promise<{ categorie?: string }>;

function CategoryLink({ href, label, active }: { href: string; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
                active
                    ? "border-olive bg-olive text-white"
                    : "bg-white hover:border-olive hover:text-olive"
            }`}
        >
            {label}
        </Link>
    );
}

async function CategoryBar({ searchParams }: { searchParams: SearchParams }) {
    const { categorie } = await searchParams;
    const data = await gql<{ allCategories: { nodes: Category[] } }>(categoriesQuery);

    // Ascundem categoriile fără produse (de ex. Cafea, deocamdată)
    const categories = data.allCategories.nodes.filter(
        (category) => category.productsByCategoryId.totalCount > 0,
    );

    return (
        <nav className="mt-6 flex flex-wrap gap-2">
            <CategoryLink href="/" label="Toate" active={!categorie} />
            {categories.map((category) => (
                <CategoryLink
                    key={category.slug}
                    href={`/?categorie=${category.slug}`}
                    label={category.name}
                    active={categorie === category.slug}
                />
            ))}
        </nav>
    );
}

async function ProductGrid({ searchParams }: { searchParams: SearchParams }) {
    const { categorie } = await searchParams;

    let products: ProductTileData[];
    if (categorie) {
        const data = await gql<{
            categoryBySlug: { productsByCategoryId: { nodes: ProductTileData[] } } | null;
        }>(categoryProductsQuery, { slug: categorie });
        products = data.categoryBySlug?.productsByCategoryId.nodes ?? [];
    } else {
        const data = await gql<{ allProducts: { nodes: ProductTileData[] } }>(allProductsQuery);
        products = data.allProducts.nodes;
    }

    if (products.length === 0) {
        return <p className="mt-8 text-neutral-600">Nu am găsit produse în această categorie.</p>;
    }

    return (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
                <ProductTile key={product.id} product={product} />
            ))}
        </div>
    );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <h1 className="text-3xl font-bold text-olive">Produsele noastre</h1>
            <p className="mt-2 text-neutral-600">
                Ulei de măsline extravirgin bio, din livada proprie din Messinia.
            </p>
            <Suspense fallback={<div className="mt-6 h-9" />}>
                <CategoryBar searchParams={searchParams} />
            </Suspense>
            <Suspense fallback={<p className="mt-8">Se încarcă produsele...</p>}>
                <ProductGrid searchParams={searchParams} />
            </Suspense>
        </main>
    );
}