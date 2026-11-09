import { Suspense } from "react";
import Link from "next/link";
import { HomeHero } from "@/components/home-hero";
import { ProductTile } from "@/components/product-tile";
import { TrustStrip } from "@/components/trust-strip";
import { gql, type ProductTileData } from "@/lib/catalog";

// Câmpurile unui card, scrise o singură dată și refolosite în ambele interogări
const tileFields = `
  fragment TileFields on Product {
    id
    name
    slug
    isOrganic
    imageUrl
    categoryByCategoryId { sortOrder }
    secondImage: productImagesByProductId(orderBy: [POSITION_ASC, CREATED_AT_ASC], first: 1, offset: 1) {
      nodes { id }
    }
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
            href={`${href}#produse`}
            // shrink-0 + whitespace-nowrap: pe telefon butonul nu se strânge și nu se rupe pe două rânduri
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm whitespace-nowrap transition ${
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

    // Pe telefon: un singur rând care se derulează lateral cu degetul (overflow-x-auto), ca să nu
    // împingă produsele în jos. -mx-4 px-4 lasă rândul să ajungă până la marginea ecranului, deci se
    // vede că mai sunt categorii în dreapta. Bara de derulare o ascundem (se derulează cu degetul).
    // De la sm (640 px): butoanele se așază pe mai multe rânduri, ca înainte.
    return (
        <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:mt-6 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
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

    // Vitrina, ca la magazinele mari: întâi produsele cu poze, în ordinea categoriilor (uleiul în
    // frunte), apoi cele încă fără poze. În fiecare grup, alfabetic. sort() păstrează ordinea la egalitate.
    products = [...products].sort((a, b) => {
        const photo = Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl));
        if (photo !== 0) return photo;
        const order = (a.categoryByCategoryId?.sortOrder ?? 999) - (b.categoryByCategoryId?.sortOrder ?? 999);
        return order !== 0 ? order : a.name.localeCompare(b.name, "ro");
    });

    if (products.length === 0) {
        return <p className="mt-8 text-neutral-600">Nu am găsit produse în această categorie.</p>;
    }

    return (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
                <ProductTile key={product.id} product={product} />
            ))}
        </div>
    );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
    return (
        // Bannerul are titlul paginii (h1); aici e secțiunea de produse (h2).
        // id="produse": ținta pentru butonul „Toate produsele” și pentru categorii.
        <>
            <HomeHero />
            <TrustStrip />
            <main id="produse" className="mx-auto w-full max-w-6xl scroll-mt-4 px-4 py-6 sm:px-8 sm:py-10">
                <h2 className="text-2xl font-bold text-olive sm:text-3xl">Produsele noastre</h2>
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
        </>
    );
}