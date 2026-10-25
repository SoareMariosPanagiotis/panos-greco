import { Suspense } from "react";
import { ProductCard, type Product } from "@/components/product-card";

const query = `
  {
    allProducts {
      nodes {
        id
        name
        isOrganic
        productVariantsByProductId(orderBy: PACK_SIZE_ASC) {
          nodes { id packSize packUnit price }
        }
      }
    }
  }
`;

async function ProductList() {
    const res = await fetch("http://localhost:5000/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
    });
    const { data } = await res.json();
    const products: Product[] = data.allProducts.nodes;

    return (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}

export default function Home() {
    return (
        <main className="p-8">
            <h1 className="text-3xl font-bold">Panos Greco</h1>
            <Suspense fallback={<p className="mt-6">Se încarcă produsele...</p>}>
                <ProductList />
            </Suspense>
        </main>
    );
}