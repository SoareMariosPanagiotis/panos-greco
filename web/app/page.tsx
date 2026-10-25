import { Suspense } from "react";
import { ProductTile } from "@/components/product-tile";
import { gql, type ProductTileData } from "@/lib/catalog";

const query = `
  {
    allProducts(orderBy: NAME_ASC, condition: { isActive: true }) {
      nodes {
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
    }
  }
`;

async function ProductGrid() {
    const data = await gql<{ allProducts: { nodes: ProductTileData[] } }>(query);
    const products = data.allProducts.nodes;

    return (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
                <ProductTile key={product.id} product={product} />
            ))}
        </div>
    );
}

export default function Home() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <h1 className="text-3xl font-bold text-olive">Produsele noastre</h1>
            <p className="mt-2 text-neutral-600">
                Ulei de măsline extravirgin bio, din livada proprie din Messinia.
            </p>
            <Suspense fallback={<p className="mt-8">Se încarcă produsele...</p>}>
                <ProductGrid />
            </Suspense>
        </main>
    );
}